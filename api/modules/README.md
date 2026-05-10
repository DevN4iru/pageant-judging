# API Modules

Future backend code should be split by business area.

Do not keep adding routes to `api/index.js`.

Target:
- `api/index.js` starts Express and mounts modules only.
- each module owns its routes, service, repository, and validation.
