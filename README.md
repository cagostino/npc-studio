<p align="center">
  <img src="https://raw.githubusercontent.com/cagostino/npc-studio/main/levi.PNG" alt="npc studio logo with Levi the dog howling at the moon" width="400" height="400">
</p>


# npc-studio

The AI application for Agent development.



## Chat with Agents and organize by project path
- NPC Studio gives users the capability to organize their conversations with AI agentst in a natural and convenient way. Users can easily change working directories and separate their conversations by project path.

![npc studio chat window interface](https://raw.githubusercontent.com/cagostino/npc-studio/main/gh_images/chat_window.png)

See thinking traces from agents:
![npc studio chat window thinking trace](https://raw.githubusercontent.com/cagostino/npc-studio/main/gh_images/reasoning.png)

- Aggregate conversations:

![select multiple conversations](https://raw.githubusercontent.com/cagostino/npc-studio/main/gh_images/aggregrate_conversations.png)

- Aggregate messages (to come)

## Create and manage agents, tools
- NPC Studio uses the `npcsh` agent framework to simplify the building and orchestration of AI agents.

![edit your agents](https://raw.githubusercontent.com/cagostino/npc-studio/main/gh_images/edit_npcs.png)

- Additionally, users can create and manage tools to be used by agents. 
![edit your tools](https://raw.githubusercontent.com/cagostino/npc-studio/main/gh_images/tool.png)


## Edit plain text files
- NPC Studio is not just a chat interface, users can also edit plain text files (with agent-based integrations soon to come).

![npc studio interface for editing plain text files](https://raw.githubusercontent.com/cagostino/npc-studio/main/gh_images/edit_files.png)



## Edit settings 

### Global Settings

![npc studio global settings](https://raw.githubusercontent.com/cagostino/npc-studio/main/gh_images/default_settings.png)


### Project Settings

![npc studio env variables for project settings](https://raw.githubusercontent.com/cagostino/npc-studio/main/gh_images/env_variables.png)

-When working in a specific folder, NPC Studio will discover an `.env` fiel if it's present and will use these API keys to determine which models can be used within the project.

![npc studio chat model selector](https://raw.githubusercontent.com/cagostino/npc-studio/main/gh_images/model_selector.png)




## Activity Dashboard (planned)

- view key activity metrics 

## Knowledge Graph (planned)
- view the knowledge graph built up over time through your actions

## Use mixtures of agents (planned)

## Exploratory data analysis (planned)

## Automate with cron jobs and system daemons (planned)




## Getting Started with Development

NPC studio is electron-based frontend with a python flask backend.


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



### items to do...
- interrupt button 
- markdown rendering

- letting ppl see lineage in npc team
- finish markdown rendering
- add a stop button
- add copy right lcik
- add a markdown render
- dark light theme halfway thru
- fix npc team menu
- fix tool menu
- database ovoervieiw tab
