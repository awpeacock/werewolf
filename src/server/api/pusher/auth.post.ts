import { setResponseHeader } from 'h3';
import type { H3Event, EventHandlerRequest } from 'h3';
import Pusher from 'pusher';
import type { ChannelAuthResponse } from 'pusher';

import { useLogger } from '@/composables/useLogger';

export default defineEventHandler(
	async (event: H3Event<EventHandlerRequest>): Promise<ChannelAuthResponse | string> => {
		try {
			setResponseHeader(event, 'cache-control', 'no-store');

			const config = useRuntimeConfig();
			const pusher = new Pusher({
				appId: config.public.PUSHER_APP_ID as string,
				key: config.public.PUSHER_APP_KEY as string,
				secret: config.PUSHER_APP_SECRET as string,
				cluster: config.public.PUSHER_CLUSTER as string,
				useTLS: true,
			});

			const body = await readBody(event);

			const socketId = body.socket_id;
			const channel = body.channel_name;
			if (!socketId || !channel) {
				let error: string = 'Missing ';
				if (!socketId) {
					error += 'socket ID';
				}
				if (!channel) {
					error += 'channel name';
				}
				useLogger().error(error + ' in Pusher auth request');

				setResponseStatus(event, 400);
				return 'Bad request: ' + error;
			}
			if (!socketId.match(/^[0-9]+\.[0-9]+$/)) {
				useLogger().error('Invalid socket ID in Pusher auth request - ' + socketId);

				setResponseStatus(event, 400);
				return 'Bad request: Invalid socket ID';
			}
			if (
				!channel.match(
					/^private-game-[A-Z0-9]{4}(-player-[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}){0,1}$/
				)
			) {
				useLogger().error('Invalid channel name in Pusher auth request - ' + channel);

				setResponseStatus(event, 400);
				return 'Bad request: Invalid channel name';
			}

			const authResponse = pusher.authorizeChannel(socketId, channel);
			return authResponse;
		} catch (e) {
			useLogger().error('Error in Pusher auth:', e as Error);

			setResponseStatus(event, 500);
			return 'Unexpected server error';
		}
	}
);
