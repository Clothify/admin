# Batch 02–04 release gate

`vercel.json` sets `git.deploymentEnabled` to `false`. Automatic Vercel Git deployments are disabled for every branch, including `main`, while this file is present. Keep it in the controlled merge so neither preview nor production builds start from the source push.

After a separately authorized release plan and environment review, remove this setting in a dedicated commit to re-enable automatic Git deployments. Local TypeScript and API session tests do not prove a deployed admin UI; no deployment was requested in this batch.
