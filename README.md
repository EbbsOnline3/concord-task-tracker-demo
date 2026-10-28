# Task Tracker

A small, browser-based task tracker for keeping a simple list of things to do. Add tasks, mark them active or completed, filter the list, and delete tasks after confirming in an in-app dialog. Tasks are saved in the browser's local storage so they remain after a refresh on the same browser.

## Features

- Add tasks (up to 200 characters).
- Mark tasks complete or active.
- Filter the list by All, Active, or Completed.
- Delete a task through a custom confirmation dialog.
- Save tasks in `localStorage`; if browser storage is unavailable, the app continues to work for the current page session.
- Use the interface on mobile and desktop screens.

## Run locally

From the project directory, start Python's built-in static web server:

```sh
python -m http.server 8000
```

Then open <http://localhost:8000> in a browser. Stop the server with `Ctrl+C`.

## Technologies

The app uses HTML, CSS, and vanilla JavaScript. It has no framework, package dependencies, or build step.

## How it was built

This small demonstration was built through a human-directed workflow using Concord, GitHub Copilot CLI, and Google Antigravity CLI. Copilot implemented the application in stages; Antigravity independently reviewed staged work and sent feedback through Concord; and a human developer inspected and tested the result.

This is not an official Concord project and should not be read as an endorsement by Concord or either tool provider. See [the workflow notes](docs/CONCORD_WORKFLOW.md) for what was reviewed and tested.
