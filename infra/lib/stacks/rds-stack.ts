import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Config } from '../configs/loader';

interface IProps extends StackProps {
  vpc: ec2.IVpc;
  defaultDatabaseName: string;
}

export class RdsStack extends Stack {
  public readonly cluster: rds.IDatabaseCluster;

  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id);

    this.cluster = this.createCluster(props);
  }

  createCluster(props: IProps): rds.DatabaseCluster {
    const parameterGroup = new rds.ParameterGroup(this, 'MySQLParameterGroup', {
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_3_02_0,
      }),
      parameters: {
        binlog_format: 'ROW',
        binlog_row_image: 'FULL',
        binlog_checksum: 'NONE',
      },
    });

    const cluster = new rds.DatabaseCluster(this, `${Config.Ns}RdsCluster`, {
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_3_02_0,
      }),
      storageEncrypted: true,
      instances: 1,
      instanceProps: {
        vpc: props.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.R5,
          ec2.InstanceSize.XLARGE
        ),
      },
      defaultDatabaseName: props.defaultDatabaseName,
      clusterIdentifier: `${Config.Ns}RdsCluster`,
      removalPolicy: RemovalPolicy.DESTROY,
      parameterGroup,
      cloudwatchLogsRetention: logs.RetentionDays.SIX_MONTHS,
    });
    cluster.addRotationSingleUser();
    cluster.connections.allowDefaultPortInternally();
    return cluster;
  }
}
