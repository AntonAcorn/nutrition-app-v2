FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY scripts/ scripts/
RUN npm install
COPY . .
ARG VITE_POSTHOG_KEY
ARG VITE_VAPID_PUBLIC_KEY
ARG VITE_SENTRY_DSN
ENV VITE_POSTHOG_KEY=$VITE_POSTHOG_KEY
ENV VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
