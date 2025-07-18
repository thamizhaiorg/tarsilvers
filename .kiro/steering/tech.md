# TAR POS - Technology Stack

## Framework & Platform
- **React Native**: Cross-platform mobile development
- **Expo SDK 53**: Development platform and build system
- **TypeScript**: Full type safety throughout the codebase
- **Expo Router**: File-based routing system (root: `./src/app`)

## Database & Backend
- **InstantDB**: Real-time database with automatic sync
- **Cloudflare R2**: Object storage for media files (images, documents)
- **AWS SDK**: S3-compatible operations for R2 storage

## Styling & UI
- **NativeWind**: Tailwind CSS for React Native
- **Tailwind CSS**: Utility-first CSS framework
- **Custom Components**: Professional POS-style UI components

## Key Libraries
- **AI Integration**: Google Generative AI, Vercel AI SDK
- **Navigation**: Expo Router with typed routes
- **Gestures**: React Native Gesture Handler, Reanimated
- **Media**: Expo Image Picker, Document Picker, Media Library
- **Storage**: AsyncStorage for local data
- **Network**: NetInfo for connectivity status

## Development Tools
- **ESLint**: Code linting with TypeScript and React Native rules
- **Jest**: Testing framework with React Native Testing Library
- **Metro**: JavaScript bundler (configured with NativeWind)
- **Babel**: JavaScript compiler with Expo presets

## Build & Deployment
- **EAS Build**: Expo Application Services for building
- **EAS Deploy**: Web deployment for Expo projects
- **Android**: Primary target platform (configured in app.json)

## Common Commands

### Development
```bash
npm start              # Start Expo development server
npm run android        # Run on Android device/emulator
npm run web           # Run web version
```

### Testing
```bash
npm test              # Run Jest tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

### Code Quality
```bash
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues automatically
npm run type-check    # Run TypeScript type checking
```

### Deployment
```bash
npm run deploy        # Export and deploy web version
```

## Environment Configuration
- **Environment Variables**: Stored in `.env` file
- **InstantDB**: Requires `EXPO_PUBLIC_INSTANT_APP_ID`
- **Cloudflare R2**: Multiple R2 configuration variables for media storage
- **Expo Config**: App configuration in `app.json` with EAS project ID

## Architecture Patterns
- **Real-time Data**: InstantDB handles automatic synchronization
- **Component-based**: Reusable UI components following POS design patterns
- **Service Layer**: Separate services for business logic (product-service, validation-service)
- **Context Providers**: React Context for global state (auth, store management)
- **File-based Routing**: Expo Router with `src/app` as root directory