# BastionHost Tunneling Tutorial

This repository is for tutorial of RDS tunneling with AWS BastionHost.

**Running this repository may cost you to provision AWS resources**

# Prerequisites

- awscli
- Nodejs 16
- AWS Account and Locally configured AWS credential

## Setup awscli

in this case, you set your AWSCLI profile to `skt`.

```bash
$ aws configure --profile skt
AWS Access Key ID [****************NCHZ]:
AWS Secret Access Key [****************AwoB]:
Default region name [us-east-1]:
Default output format [json]:
```

## Install dependencies

```bash
$ cd infra
$ npm i -g aws-cdk@2.44
$ npm i
```

## Configuration

open [**infra/env/dev.env**](/infra/env/dev.env) and fill the blow fields

- `AWS_ACCOUNT_ID`: 12 digit account id
- `VPC_ID`: vpc id
- `INGRESS_CIDR`: ip address for bastion-host. e.g. 127.0.0.1/32
- `DATABASE_NAME`: mysql default database name e.g. 'my_database'

and copy `env/dev.env` file to project root as `.env`

```bash
$ cd infra
$ cp env/dev.env .env
```

## Deploy for dev

if you never run bootstrap on the account, bootstrap it.

```bash
$ cdk bootstrap
```

deploy infrastructure

```bash
$ cdk deploy "*" --require-approval never
```

# Use RDS Tunneling

Connection chain goes like this...

[RDS] <====> [BastionHost] <====> [Localhost]
[5432] <====> [5432:8888] <====> [8888:5432]

## Install Socat and portforward RDS with it on BastionHost

Visit CloudFormation console and click _BastionHostStackAlpha -> Output_
copy value of _BastionHostAlphaBastionHostIdxxx_.
It is instance-id of Bastionhost.

Connect to instance via ssm.

```bash
$ aws ssm start-session --target YOUR_INSTANCE_ID

sh-4.2$
```

Visit CloudFormation console and click _RdsStackAlpha -> Output_
copy value of key _RdsClusterUrlAlpha_. It is cluster endpoint url of RDS.

Install _Socat_ to portforward _RDS:5432_ to _localhost:8888_

```bash
$ sudo yum install socat -y
$ sudo socat -d -d TCP4-LISTEN:8888,fork TCP4:YOUR_RDS_CLUSTER_URL:5432

2020/04/30 13:26:34 socat[3074] N listening on AF=2 0.0.0.0:8888
...
```

Now, [RDS] <==> [BastionHost] connection is setted.

## Local tunneling using SSM portforwarding

In order to make tunnel between [BastionHost] <==> [Localhost], run _scripts/tunnel.sh_ on your local machine.

```bash
$ ./scripts/tunnel.sh
Starting session with SessionId: dongkyl-0782ce1a820e0288a
Port 5432 opened for sessionId dongkyl-0782ce1a820e0288a
```

Done! [BastionHost] <==> [Localhost] connection is made now.

## Connect to RDS PostgresQL via localhost:5432

### Get RDS connection password

Get your RDS credential from `AWS Secrets Manager` Service. Visit _AWS Secrets Manager_ service and click _Retrieve secret value_ button.

_AWS Secrets Manager_ is highly secured key-value store.

By using AWS Secrets Manager, you can get rid of hardcoded RDS related information from your code.

### Connect to RDS through localhost:5432

connect to _localhost:5432_ with your preferred pgdb client, like PgAdmin4, DBeaver.

> If you are using DBeaver, you should turn off the settings `Open separate connection for metadata read` at _DBeaver -> Metadata_ menu.
> and turn off the settings `Open separate conneciton for each editor` at _DBeaver -> SQL Editor_ menu.
> AWS SSM connection does not support multi connection which means that only one person can connect to RDS via SSM at the same time.

Install dependencies for sample app.

```bash
$ pip install psycopg2-binary boto3 -U
```

Here is sample code..

```python
import json
import boto3
import psycopg2 as pg2

client = boto3.client('secretsmanager')

secret_value = client.get_secret_value(SecretId='arn:aws:secretsmanager:ap-northeast-2:929831892372:secret:RdsClusterAlphaSecretxxx-xxx-xxx')

D = json.loads(secret_value['SecretString'])
dbname = D['dbname']
user = D['username']
password = D['password']

conn = pg2.connect(
    host='localhost',
    dbname=dbname,
    user=user,
    password=password,
    port=5432
)

cursor = conn.cursor()
cursor.execute('SELECT version()')

cursor.fetchall()

conn.close()
```
