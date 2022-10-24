#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/stacks/vpc-stack';
import { RdsStack } from '../lib/stacks/rds-stack';
import { BastionHostStack } from '../lib/stacks/bastion-stack';
import { Config } from '../lib/configs/loader';

const app = new cdk.App();

const vpcStack = new VpcStack(app, `${Config.Ns}VpcStack`, {
  vpcId: Config.VpcId,
  env: {
    account: Config.AWS.Account,
    region: Config.AWS.Region,
  },
});

const dbStack = new RdsStack(app, `${Config.Ns}DbStack`, {
  vpc: vpcStack.vpc,
  defaultDatabaseName: Config.DatabaseName,
  enableBinlog: true,
});
dbStack.addDependency(vpcStack);

const bastionHostStack = new BastionHostStack(
  app,
  `${Config.Ns}BastionHostStack`,
  {
    vpc: vpcStack.vpc,
    securityGroup: dbStack.securityGroup,
  }
);
bastionHostStack.addDependency(dbStack);

const tags = cdk.Tags.of(app);
tags.add(`namespace`, Config.Ns);
tags.add(`stage`, Config.Stage);

app.synth();
