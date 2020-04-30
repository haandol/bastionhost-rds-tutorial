#!/bin/sh

INSTANCE_ID=$(aws ec2 describe-instances --filter "Name=tag:Name,Values=BastionHostAlpha" \
              --query "Reservations[].Instances[?State.Name == 'running'].InstanceId[]" --output text)
echo $INSTANCE_ID
aws ssm start-session \
--target $INSTANCE_ID \
--document-name AWS-StartPortForwardingSession \
--parameters '{"portNumber":["8888"], "localPortNumber":["5432"]}'
