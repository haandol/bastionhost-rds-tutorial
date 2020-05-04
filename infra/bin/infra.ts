#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { VpcStack } from '../lib/vpc-stack';
import { RdsStack } from '../lib/rds-stack';
import { BastionHostStack } from '../lib/bastion-stack';

const ns = 'Alpha';
const app = new cdk.App({
  context: {
    ns,
    ingressCIDR: '211.193.59.247/32',
  },
});

const vpcStack = new VpcStack(app, `VpcStack${ns}`);

const bastionHostStack = new BastionHostStack(app, `BastionHostStack${ns}`, {
  vpc: vpcStack.vpc,
});
bastionHostStack.addDependency(vpcStack);

const rdsStack = new RdsStack(app, `RdsStack${ns}`, {
  vpc: vpcStack.vpc,
});
rdsStack.addDependency(vpcStack);
