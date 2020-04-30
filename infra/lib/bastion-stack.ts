import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';

interface Props {
  vpc: ec2.Vpc;
}

const Config = {
  ingressCIDR: '211.193.59.247/32',
};

export class BastionHostStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id);

    const ns = scope.node.tryGetContext('ns') || '';

    const bastionHost = new ec2.BastionHostLinux(this, `BastionHost${ns}`, {
      vpc: props.vpc,
      instanceName: `BastionHost${ns}`,
    });
    bastionHost.allowSshAccessFrom(ec2.Peer.ipv4(Config.ingressCIDR));
  }

}