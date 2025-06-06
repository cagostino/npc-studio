# npc_serve.py
import subprocess
import sys
import os

from npcpy.modes.serve import start_flask_server
if __name__ == "__main__":
    # Set environment variables to prevent Flask debug mode issues
    os.environ['FLASK_ENV'] = 'production'
    os.environ['FLASK_DEBUG'] = '0'
    os.environ['WERKZEUG_RUN_MAIN'] = 'true'
    
    start_flask_server(
        port="5337", 
        cors_origins="localhost:5173", debug=False)