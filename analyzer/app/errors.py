"""
Error handling and optional bearer-token auth for the analyzer sidecar.

The legacy Flask controllers mapped failures as follows, and this module
reproduces exactly that behaviour:

    ValueError raised by a service   -> 400 {"error": str(exc)}
    malformed / invalid request body -> 400 {"error": <message>}
    anything unexpected              -> 500 {"error": "Internal server error."}
"""

from __future__ import annotations

import logging
import secrets

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

logger = logging.getLogger("analyzer")

INTERNAL_ERROR_MESSAGE = "Internal server error."
INVALID_BODY_MESSAGE = "Request body must be a JSON object."
UNAUTHORIZED_MESSAGE = "Unauthorized."

# Pydantic error types that mean "the JSON body was not an object" -- the
# legacy controller answered those with INVALID_BODY_MESSAGE.
_BODY_SHAPE_ERROR_TYPES = {"json_invalid", "model_attributes_type", "dict_type"}


def error_response(status_code: int, message: str) -> JSONResponse:
    """Build the legacy error envelope: {"error": "<message>"}."""
    return JSONResponse(status_code=status_code, content={"error": message})


def validation_error_message(exc: RequestValidationError) -> str:
    """Collapse FastAPI/pydantic validation errors into one legacy-style message."""
    errors = exc.errors()

    if errors and all(err.get("type") in _BODY_SHAPE_ERROR_TYPES for err in errors):
        return INVALID_BODY_MESSAGE

    if errors and all(err.get("type") == "missing" for err in errors):
        missing = [
            str(err["loc"][-1]) for err in errors if err.get("loc")
        ]
        if missing:
            # Field order matches the legacy controllers' required_fields tuple.
            return "Missing required fields: " + ", ".join(missing)

    messages = []
    for err in errors:
        location = ".".join(
            str(part) for part in err.get("loc", ()) if part != "body"
        )
        text = str(err.get("msg", "Invalid request."))
        messages.append(f"{location}: {text}" if location else text)

    return "; ".join(messages) or "Invalid request."


def install_exception_handlers(app: FastAPI) -> None:
    """Register the legacy-compatible exception handlers on app."""

    @app.exception_handler(RequestValidationError)
    async def _handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return error_response(400, validation_error_message(exc))

    @app.exception_handler(ValueError)
    async def _handle_value_error(
        request: Request, exc: ValueError
    ) -> JSONResponse:
        # Service-level validation (unknown agent, bad year, no data, ...).
        return error_response(400, str(exc))

    @app.exception_handler(Exception)
    async def _handle_unexpected_error(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception(
            "Unhandled analyzer error on %s %s", request.method, request.url.path
        )
        return error_response(500, INTERNAL_ERROR_MESSAGE)


class BearerTokenMiddleware(BaseHTTPMiddleware):
    """Require "Authorization: Bearer <token>" on protected paths.

    Only enabled when ANALYZER_TOKEN is configured; health checks stay public.
    """

    def __init__(
        self,
        app,
        token: str,
        protected_prefix: str = "/v1/",
    ) -> None:
        super().__init__(app)
        self.token = token
        self.protected_prefix = protected_prefix

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if request.url.path.startswith(self.protected_prefix):
            if not self._is_authorized(request.headers.get("authorization", "")):
                logger.warning(
                    "Rejected unauthenticated %s %s", request.method, request.url.path
                )
                return error_response(401, UNAUTHORIZED_MESSAGE)
        return await call_next(request)

    def _is_authorized(self, header_value: str) -> bool:
        scheme, _, credentials = header_value.partition(" ")
        if scheme.lower() != "bearer":
            return False
        return secrets.compare_digest(
            credentials.strip().encode("utf-8"),
            self.token.encode("utf-8"),
        )
