import { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class FellowApi implements ICredentialType {
	name = 'fellowApi';
	displayName = 'Fellow API';
	documentationUrl = 'https://developers.fellow.ai/reference/introduction';
	properties: INodeProperties[] = [
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'mycompany',
			description: 'Your Fellow workspace subdomain (e.g., if your Fellow URL is mycompany.fellow.app, enter "mycompany")',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your Fellow API Key from Developer Settings',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-KEY': '={{$credentials.apiKey}}',
			},
		},
	};
}
