FROM oven/bun:1-debian   AS builder

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile

RUN bun run docker:build

FROM jacoblincool/workerd:latest

COPY --from=builder /app/worker.capnp ./worker.capnp

EXPOSE 8080/tcp
CMD ["serve", "--experimental", "--binary", "worker.capnp"]
