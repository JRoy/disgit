FROM jacoblincool/workerd:latest

COPY ./worker.capnp ./worker.capnp

EXPOSE 8080/tcp
CMD ["serve", "--experimental", "--binary", "worker.capnp"]
