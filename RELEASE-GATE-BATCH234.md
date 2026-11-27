# Batch 02–04 release gate

The original Batch 02–04 merge set `git.deploymentEnabled` to `false`, which blocked automatic Vercel deployments even after later Admin changes reached `main`.

The 26 November release request re-enables Git deployments in a dedicated release commit. Promote the Admin source only after its matching backend contract and migrations are serving production. Verify the new Vercel production deployment's Git SHA, live alias, and Merchant > Bank reviews access with an Operations account. Source checks alone do not prove the live Admin UI.
