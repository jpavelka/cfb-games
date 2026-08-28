# Builds the cfb-scoreboard-refresh Cloud Run service — see the plan at
# .claude/plans (or ask Claude) for the full design. This has nothing to do with the
# frontend: the GitHub Pages site is a static `adapter-static` build with no Docker
# involved at all.
#
# The build context is the whole repo (not just server/) because server/index.ts
# imports src/lib/espn and src/lib/game directly, and Docker can't COPY files from
# outside its build context. Deploy with:
#   gcloud run deploy cfb-scoreboard-refresh --source . --project <project> --region <region>
FROM node:22-alpine

WORKDIR /app

COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev && npm cache clean --force

COPY src/lib ./src/lib
COPY server ./server

WORKDIR /app/server
ENV NODE_ENV=production

CMD ["npx", "tsx", "index.ts"]
