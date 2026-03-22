package utils

import (
	"log"

	"task-manager/internal/config"

	"github.com/IBM/sarama"
)

func NewKafkaProducer(cfg config.KafkaConfig) (sarama.SyncProducer, error) {
	saramaConfig := sarama.NewConfig()
	saramaConfig.Producer.Return.Successes = true
	saramaConfig.Producer.RequiredAcks = sarama.WaitForAll
	saramaConfig.Producer.Retry.Max = 3

	producer, err := sarama.NewSyncProducer(cfg.Brokers, saramaConfig)
	if err != nil {
		return nil, err
	}

	log.Println("✅ Connected to Kafka")
	return producer, nil
}
