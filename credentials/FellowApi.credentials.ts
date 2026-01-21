import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

import { FELLOW_API_BASE_URL_PATTERN, FELLOW_SKIP_SSL_VALIDATION } from '../nodes/Fellow/apiConfig';

// Build the credential test URL using the same pattern as the node
// This ensures dev/staging/prod builds all use the correct environment URL
const credentialTestBaseUrl = `=${FELLOW_API_BASE_URL_PATTERN.replace('{subdomain}', '{{$credentials.subdomain}}')}`;

export class FellowApi implements ICredentialType {
	name = 'fellowApi';
	displayName = 'Fellow API';
	icon = 'file:FellowApi.svg' as const;
	documentationUrl = 'https://developers.fellow.ai/reference/introduction';
	properties: INodeProperties[] = [
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'mycompany',
			description:
				'Your Fellow workspace subdomain (e.g., if your Fellow URL is mycompany.fellow.app, enter "mycompany")',
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

	test: ICredentialTestRequest = {
		request: {
			baseURL: credentialTestBaseUrl,
			url: '/me',
			method: 'GET',
			skipSslCertificateValidation: FELLOW_SKIP_SSL_VALIDATION,
		},
	};
}
