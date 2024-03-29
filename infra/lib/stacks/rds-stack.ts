import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Config } from '../configs/loader';

interface IProps extends StackProps {
  vpc: ec2.IVpc;
  defaultDatabaseName: string;
  enableBinlog: boolean;
}

export class RdsStack extends Stack {
  public readonly cluster: rds.IDatabaseCluster;
  public readonly securityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id);

    this.cluster = this.newCluster(props);
    this.securityGroup = this.cluster.connections.securityGroups[0];

    new CfnOutput(this, 'RdsSecurityGroupOutput', {
      exportName: `${Config.Ns}RdsSecurityGroup`,
      value: this.securityGroup.securityGroupId,
    });
  }

  newCluster(props: IProps): rds.DatabaseCluster {
    const parameterGroup = new rds.ParameterGroup(this, 'MySQLParameterGroup', {
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_3_02_1,
      }),
    });
    parameterGroup.addParameter('sort_buffer_size', '2097152'); // 2MB

    if (props.enableBinlog) {
      parameterGroup.addParameter('binlog_format', 'ROW');
      parameterGroup.addParameter('binlog_row_image', 'FULL');
      parameterGroup.addParameter('binlog_checksum', 'NONE');
    }

    const cluster = new rds.DatabaseCluster(this, `${Config.Ns}RdsCluster`, {
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_3_02_1,
      }),
      storageEncrypted: true,
      instanceProps: {
        vpc: props.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.R6G,
          ec2.InstanceSize.XLARGE
        ),
      },
      defaultDatabaseName: props.defaultDatabaseName,
      clusterIdentifier: `${Config.Ns}RdsCluster`,
      removalPolicy: RemovalPolicy.DESTROY,
      parameterGroup,
      cloudwatchLogsRetention: logs.RetentionDays.THREE_MONTHS,
    });
    cluster.addRotationSingleUser();
    cluster.connections.allowInternally(ec2.Port.tcp(3306), 'self');

    new CfnOutput(this, 'RdsSecretsOutput', {
      exportName: `${Config.Ns}RdsSecrets`,
      value: cluster.secret?.secretArn || '',
    });

    return cluster;
  }
}
