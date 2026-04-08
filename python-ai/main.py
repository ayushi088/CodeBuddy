"""Entry point for StudyBuddy Python AI service and monitor."""

from __future__ import annotations

import argparse

from api_server import run_server
from app import main as run_monitor


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="StudyBuddy Python AI runtime")
    parser.add_argument(
        "--mode",
        choices=["api", "monitor"],
        default="api",
        help="Run API server for frontend integration (default) or local webcam monitor.",
    )
    parser.add_argument("--host", default="0.0.0.0", help="API host (api mode only)")
    parser.add_argument("--port", type=int, default=8000, help="API port (api mode only)")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    if args.mode == "monitor":
        run_monitor()
    else:
        run_server(host=args.host, port=args.port)
