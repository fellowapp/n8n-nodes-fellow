import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class FellowApi implements ICredentialType {
	name = 'fellowApi';
	displayName = 'Fellow API';
	documentationUrl = 'https://developers.fellow.app/reference/authentication'; // Placeholder URL
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true, // Masks the input
			},
			default: '',
			required: true,
			description: 'Your Fellow Application API Key',
		},
		{
			displayName: 'Email Address',
			name: 'email',
			type: 'string',
			default: '',
			required: true,
			description: 'The email address associated with your Fellow account for Basic Auth.',
		},
	];
}
