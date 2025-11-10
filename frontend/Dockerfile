FROM node:20.19.0

WORKDIR /app

# Copy only the package files first
COPY package*.json ./

# Install *all* deps, including optional, clean first incase local.
RUN npm install

# Then copy the rest of your app
COPY . .

# Run the dev server
CMD ["npm", "run", "dev"]
