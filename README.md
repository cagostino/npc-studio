<p align="center">
  <img src="https://raw.githubusercontent.com/cagostino/npc-studio/main/levi.PNG" alt="npc studio logo with Levi the dog howling at the moon" width="200" height="200">
</p>


# npc-studio

The AI application for Agent development.

NPC studio is electron-based frontend with a python flask backend.

## Getting Started

Before getting started with development, ensure that you have the following installed
- [npcsh](https://github.com/cagostino/npcsh)
- node+npm
- ollama (if you plan to rely on local models)

```bash
git clone https://github.com/cagostino/npc-studio.git
```

```bash
npm install
```
Start the electron backend:
```bash
npm run dev
```
Start the flask backend:
```bash
npc serve -p 5337 -c 'localhost:5137' # the -c indicates the url of the frontend so that the server can use CORS
```
Alternatively use the wrapper script that is provided
```bash
python npc_studio_serve.py
```
Start the electron frontend:
```bash
npm start
```


## Build
```bash
npm run build
```
This will build the frontend and backend into a single executable file. In its current state, it specifies a build target for
creating .deb and AppImage files in linux. Other OS to be added in the future.


### License
NPC Studio is licensed under AGPLv3 with additional terms explicitly prohibiting the offering of third-party SaaS services which provide a user access to any web-hosted version of the software as well as prohibiting the packaged re-sale of the product. Please see the [LICENSE](LICENSE) file for further details.



# letting ppl see lineage in npc team

-add a stop button
add copy right lcik
add a markdown render




-add a stop button
add copy right lcik
add a markdown render