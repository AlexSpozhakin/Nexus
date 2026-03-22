FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o api ./cmd/api
RUN go build -o migrate ./scripts/migrate.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/
COPY --from=builder /app/api .
COPY --from=builder /app/migrate .
COPY --from=builder /app/migrations ./migrations

EXPOSE 8080

CMD ./migrate && ./api
