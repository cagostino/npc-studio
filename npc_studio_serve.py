# npc_serve.py
import subprocess
import sys


def main():
    try:
        # Call the npc serve command with arguments
        subprocess.run(
            ["npc", "serve", "-p", "5337", "-c", "localhost:5173"], check=True
        )
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
