# BastionHost Tunneling Tutorial

This repository is for tutorial of RDS tunneling with AWS BastionHost.

**Running this repository may cost you to provision AWS resources**

# Prerequisites

- awscli
- Nodejs 10.20+
- AWS Account and Locally configured AWS credential

# Installation

Install project dependencies

```bash
$ cd infra
$ npm i
```

Install cdk in global context and run `cdk init` if you did not initailize cdk yet.

```bash
$ npm i -g cdk
$ cdk init
$ cdk bootstrap
```

Replace allowing *ingressCIDR* with your public CIDR block at [**bin/infra.ts**](bin/infra.ts)

```typescript
const app = new cdk.App({
  context: {
    ns,
    ingressCIDR: '211.193.59.247/32', <-- replace it.
  },
});
```

Deploy CDK Stacks on AWS

```bash
$ cdk deploy "*" --require-approval never
```

# Use RDS Tunneling

Connection chain goes like this...

[RDS] <====> [BastionHost] <====> [Localhost]
[5432] <====> [5432:8888] <====> [8888:5432]


## Install Socat and portforward RDS with it on BastionHost

Visit CloudFormation console and click *BastionHostStackAlpha -> Output*
copy value of *BastionHostAlphaBastionHostIdxxx*.
It is instance-id of Bastionhost.

Connect to instance via ssm.

```bash
$ aws ssm start-session --target YOUR_INSTANCE_ID

sh-4.2$
```

Visit CloudFormation console and click *RdsStackAlpha -> Output*
copy value of key *RdsClusterUrlAlpha*. It is cluster endpoint url of RDS.

Install *Socat* to portforward *RDS:5432* to *localhost:8888*

```bash
$ sudo yum install socat -y
$ sudo socat -d -d TCP4-LISTEN:8888,fork TCP4:YOUR_RDS_CLUSTER_URL:5432

2020/04/30 13:26:34 socat[3074] N listening on AF=2 0.0.0.0:8888
...
```

Now, [RDS] <==> [BastionHost] connection is setted.

## Local tunneling using SSM portforwarding

In order to make tunnel between [BastionHost] <==> [Localhost], run *scripts/tunnel.sh* on your local machine.

```bash
$ ./scripts/tunnel.sh
Starting session with SessionId: dongkyl-0782ce1a820e0288a
Port 5432 opened for sessionId dongkyl-0782ce1a820e0288a
```

Done! [BastionHost] <==> [Localhost] connection is made now.

## Connect to RDS PostgresQL via localhost:5432

### Get RDS connection password

Get your RDS credential from `AWS Secrets Manager` Service. Visit *AWS Secrets Manager* service and click *Retrieve secret value* button.

*AWS Secrets Manager* is highly secured key-value store.

By using AWS Secrets Manager, you can get rid of hardcoded RDS related information from your code.

### Connect to RDS through localhost:5432

connect to *localhost:5432* with your preferred pgdb client, like PgAdmin4, DBeaver.

> If you are using DBeaver, you should turn off the settings `Open separate connection for metadata read` at *DBeaver -> Metadata* menu.
> and turn off the settings `Open separate conneciton for each editor` at *DBeaver -> SQL Editor* menu.
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
