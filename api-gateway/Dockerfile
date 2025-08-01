FROM nginx:stable-alpine

# Remove default nginx configuration
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy our custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
