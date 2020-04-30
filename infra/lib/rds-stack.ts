import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as rds from '@aws-cdk/aws-rds';

interface Props {
  vpc: ec2.Vpc;
}

export class RdsStack extends cdk.Stack {
  private readonly cluster: rds.DatabaseCluster;

  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id);

    const ns = scope.node.tryGetContext('ns') || '';

    this.cluster = this.createCluster(ns, props);
    new cdk.CfnOutput(this, `RdsClusterUrl${ns}`, {
      exportName: 'RdsUrl',
      value: this.cluster.clusterEndpoint.hostname,
    });
  }

  createCluster(ns: string, props: Props): rds.DatabaseCluster {
    const cluster = new rds.DatabaseCluster(this, `RdsCluster${ns}`, {
        engine: rds.DatabaseClusterEngine.AURORA_POSTGRESQL,
        engineVersion: '11.6',
        masterUser: {
          username: 'postgres',
        },
        instanceProps: {
          vpc: props.vpc,
          vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE },
          instanceType: ec2.InstanceType.of(ec2.InstanceClass.R5, ec2.InstanceSize.LARGE),
        },
        port: 5432,
        instances: 1,
        defaultDatabaseName: 'pgdb',
        clusterIdentifier: `RdsCluster${ns}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        parameterGroup: rds.ParameterGroup.fromParameterGroupName(
          this,
          `RdsParameterGroup${ns}`,
          'default.aurora-postgresql11'
        ),
      });
      cluster.addRotationSingleUser();
      cluster.connections.allowDefaultPortInternally();
      cluster.connections.allowDefaultPortFrom(ec2.Peer.ipv4(props.vpc.vpcCidrBlock));
      return cluster;
  }

}