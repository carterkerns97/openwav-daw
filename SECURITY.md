# Security policy

## Reporting a vulnerability

Please do not open a public issue for an undisclosed vulnerability. Use GitHub's private vulnerability reporting for this repository when available, or contact the repository owner privately through their GitHub profile.

Include affected versions, reproduction steps, impact, and any suggested mitigation. Do not include credentials, private recordings, or other users' project files in a report.

## Supported versions

Openwave is pre-release software. Security fixes currently apply to the latest commit on `main`; no stable release line is supported yet.

## Scope

Security-sensitive areas include project-file parsing, audio/plugin loading, native IPC, filesystem access, update/install packaging, imported media, and third-party plugin isolation. Treat project files, plugins, presets, and media as untrusted input.
