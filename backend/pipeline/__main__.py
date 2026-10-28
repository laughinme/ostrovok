"""Run with `cd backend && uv run --group pipeline python -m pipeline <command>`."""

import argparse
import importlib

from pipeline import manifest

STAGES = ("pbf", "osm", "dem", "climate", "hotels", "graph")
COMMANDS = (*STAGES, "manifest", "all")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=COMMANDS)
    args = parser.parse_args()
    commands = STAGES if args.command == "all" else (args.command,)
    for command in commands:
        importlib.import_module(f"pipeline.{command}").run()
    if args.command != "manifest":
        manifest.run()


if __name__ == "__main__":
    main()
