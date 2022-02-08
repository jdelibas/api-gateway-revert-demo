import { Stack, StackProps } from 'aws-cdk-lib';
import { aws_apigateway as apigateway } from 'aws-cdk-lib';
import { aws_lambda as lambda } from 'aws-cdk-lib';
import { aws_logs as logs } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';

if (!process.env.DEPLOY_COUNT) {
  throw new Error('DEPLOY_COUNT is not set');
}

export class ApiGatewayRevertDemoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const fn = new lambda.Function(this, 'fn', {
      code: lambda.Code.fromAsset(path.resolve(__dirname, '../functions')),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
    });

    const logGroup = new logs.LogGroup(this, 'logs');

    const api = new apigateway.LambdaRestApi(this, 'restapi', {
      restApiName: 'cdk-egress-gateway-demo',
      handler: fn,
      proxy: false,
      description: 'This was created by CDK',
      deployOptions: {
        stageName: 'default',
        tracingEnabled: true,
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: false,
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.custom(
          `${process.env.DEPLOY_COUNT} ${apigateway.AccessLogField.contextRequestId()} ${apigateway.AccessLogField.contextErrorMessage()} ${apigateway.AccessLogField.contextErrorMessageString()}`
        ),
      },
      retainDeployments: true,
    }); 
    
    const items = api.root.addResource('{proxy+}');
    items.addMethod('any', new apigateway.HttpIntegration('http://amazonaws.com'));
  }
}
