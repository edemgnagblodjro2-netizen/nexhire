FROM grafana/alloy:latest

COPY alloy.river /etc/alloy/config.river

EXPOSE 12345

CMD ["run", \
     "--server.http.listen-addr=0.0.0.0:12345", \
     "--stability.level=generally-available", \
     "/etc/alloy/config.river"]
