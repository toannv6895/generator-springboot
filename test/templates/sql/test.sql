CREATE TABLE customers
(
    id           BIGINT AUTO_INCREMENT NOT NULL,
    first_name   VARCHAR(255) NULL,
    last_name    VARCHAR(255) NULL,
    email        VARCHAR(255) NOT NULL,
    CONSTRAINT pk_users PRIMARY KEY (id)
);