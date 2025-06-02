# npc_serve.py
import subprocess
import sys

from npcpy.modes.serve import start_flask_server
if __name__ == "__main__":
    start_flask_server(
        port="5337", 
        cors_origins="localhost:5173")             
