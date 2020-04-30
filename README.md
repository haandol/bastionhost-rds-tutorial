# BastionHost Tunneling Tutorial

This repository is for tutorial of RDS tunneling with AWS BastionHost.

**Running this repository may cost your AWS Account.**

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

Replace allowing CIDR block with your CIDR block at **bastion-stack.ts**

```typescript
const Config = {
  ingressCIDR: '211.193.59.247/32', <-- replace it.
};
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

> AWS SSM connection does not support multi connection which means that only one person can connect to RDS via SSM at the same time.

connect to *localhost:5432* with your preferred pgdb client, like PgAdmin4, DBeaver.

> If you are using DBeaver, you should turn off the settings `Open separate connection for metadata read` at *DBeaver -> Metadata* menu.