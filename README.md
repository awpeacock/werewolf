# Werewolf Game

A web-based implementation of the classic party game, built using [Vue 3](https://vuejs.org/) and [Nuxt 3](https://nuxt.com/).

## Setup

Make sure to install dependencies:

```bash
npm install
```

### Environment Configuration

You can create multiple `.env` files for different environments, such as:

- `.env.local`
- `.env.dev`
- `.env.qa`
- `.env.preprod`
- `.env.prod`

To specify which environment to use when running a script, pass the `--env=<name>` flag (e.g., `--env=dev`). If no environment is specified, the default `.env` file will be used if present (except when running tests, where the default will be `.env.test`).

#### AWS Provisioning

The following environment variables must be defined in a `.env` file:

```properties
AWS_STACK               # The name your AWS CloudFormation stack will be created with
AWS_REGION              # The AWS region for hosting your DynamoDB instance (e.g. eu-west-1)
AWS_ACCESS_KEY_ID       # Your AWS access key ID
AWS_SECRET_ACCESS_KEY   # Your AWS secret access key
AWS_DYNAMODB_TABLE      # The name your DynamoDB table will be created with
```

To provision AWS resources for the selected environment:

```bash
npm run setup --env=dev
```

To tear down these resources:

```bash
npm run destroy --env=dev
```

Alternatively, these steps are automatically run as a preliminary step before `test` or `dev` unless explicitly prevented:

```bash
npm run dev --setup=no
```

#### Broadcast Provider

By default, the app uses WebSockets to push game updates to players. To switch to Pusher, set the following in your `.env` file:

```bash
BROADCAST_PROVIDER=Pusher

PUSHER_APP_ID           # Your Pusher app ID
PUSHER_APP_KEY          # Your Pusher app key
PUSHER_APP_SECRET       # Your Pusher app secret
PUSHER_CLUSTER          # Your Pusher cluster (e.g. eu)
```

If `BROADCAST_PROVIDER` is not set, the app defaults to using native WebSockets.

#### Additional Configuration

You can optionally set the following variables:

```bash
CREATE_MAX_RETRIES      # Max attempts to create a game with a unique code (default is 3)
DB_LOCK_MAX_RETRIES     # Max retries for resolving concurrent DB update conflicts (default is 10)
MIN_PLAYERS             # Minimum number of players required to start a game (default is 6)
```

## Development

Start the development server at `http://localhost:3000`:

```bash
npm run dev
```

By default, this will also run the setup script. You can skip setup with:

```bash
npm run dev --setup=no
```

## Production

To build the application for production:

```bash
npm run build
```

This will also run the setup script by default unless disabled:

```bash
npm run build --setup=no
```

### Previewing the Production Build

To locally preview the built site:

```bash
npm run preview
```

This command also triggers a build unless explicitly skipped:

```bash
npm run preview --build=no
```

## Testing

Run the test suite with:

```bash
npm run test
```

By default, this will use the `test` environment, and will automatically provision the necessary AWS resources before running tests. Once the tests complete, the environment will be torn down.

To skip the setup step (e.g., when testing locally against an already provisioned environment), use:

```bash
npm run test --setup=no
```

## Script Flags Summary

Most scripts support the following optional flags:

- `--env=<environment>` : Specify the environment configuration to use.
- `--setup=no` : Skip automatic setup when starting or building the app.
- `--build=no` : Skip building the app before previewing (used with npm run preview).

## License

This project is licensed under the MIT License **with the Commons Clause** — meaning it may not be used for commercial purposes. See the [LICENSE](./LICENSE) file for full details.
