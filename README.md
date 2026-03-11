# AIGUIDE

AIGuide is a web application that helps you plan road trips. Me and my team of agents has vibe coded this, so there's certainly going to be some fun stuff
in the codebase. Share your findings for all to enjoy! 

The concept is like so; add a trip, set up start and stop dates and routing preferences. Click the day, add a destination for the day - I like to just pick like cities in the general are I think we might be going. Routes are calculated as you go. You can edit the route adding or moving waypoints.

Then the fun stuff - click on the map and do Search Nearby - you get the lookup from the map provider you chose of the type of Places added to the map. Same thing with Park4Night, Tripadvisor and FourSquare. The added Places can be used as Destination (updating the day), a Via, which plans the route via this point, a POI which is just a list of interesting Places recorded on that day, and Parkup, which are alternative layovers (if the preferred destination is full and you need a backup).

The really powerful stuff is the AI Research. It builds a search using the searxng server (if provided) to gather information along the route inside the perimeter of the screen. Finds maximum 10-12 places and ranks them similar to Guide Michelin - 1 star is worth a stop, 2 stars is worth a detour, and 3 is worth the trip on it's own. Any Place already cached is ignored in the searxng search. This gives the most interesting results.

Another fun thing.. you can create an alternative branch - plan an alternative route for parts of the same trip - + on the right side of the day. And you can designate a day as a layover - no traveling that day, but still store POI and stuff...

Use with care! During testing my experience is that $10 on the Claude API goes a long way - Haiku is more than sufficient ... and never got above free on the other ones. Have fun and share your experiences. I probably won't fix bugs or new features unless I feel like it...

Øyvind

PS: Only implemented Planning so far.. plan to use GPS position to do live update of the actual trip and see if that could be useful!

The vibe coding stuff begins:





# Agentic Software Engineering Starter

Minimal Python workspace for building and testing software-engineering agents.

## What's included

- `src/agentic_se/agents`: agent roles and interfaces
- `src/agentic_se/tools`: tool abstractions and registry
- `src/agentic_se/memory`: lightweight memory model/store
- `src/agentic_se/workflows`: orchestration workflow
- `prompts/`: prompt templates
- `tests/`: baseline tests

## Quick start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
cp .env.example .env

```
## Run

```bash
agentic-se "Create API endpoint for tasks" --dry-run
```

## Dev tasks

```bash
ruff check .
ruff format .
pytest
mypy src
```

## Make shortcuts

```bash
make setup
make test
make lint
make run TASK="Initialize CI pipeline"
```

## Backlog workspace

All product and engineering planning artifacts should live under `backlog/`:

- `backlog/epics/`
- `backlog/stories/`
- `backlog/tasks/`
- `backlog/tracking/`
- `backlog/architecture/`
- `backlog/research/`

Use markdown files in these folders for ongoing planning, delivery tracking, architecture decisions, and research notes.

