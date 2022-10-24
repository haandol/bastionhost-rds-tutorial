import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Config } from '../configs/loader';

interface IProps extends StackProps {
  vpc: ec2.IVpc;
  securityGroup: ec2.ISecurityGroup;
}

export class BastionHostStack extends Stack {
  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id, props);

    const host = new ec2.BastionHostLinux(this, `BastionHost`, {
      vpc: props.vpc,
      subnetSelection: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          mappingEnabled: true,
          volume: ec2.BlockDeviceVolume.ebs(32, {
            deleteOnTermination: true,
            volumeType: ec2.EbsDeviceVolumeType.GP2,
            encrypted: true,
          }),
        },
      ],
      instanceName: `${Config.Ns}BastionHost`,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MEDIUM
      ),
    });
    host.connections.addSecurityGroup(props.securityGroup);
  }
}
