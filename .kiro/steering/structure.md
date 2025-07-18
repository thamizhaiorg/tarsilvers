# TAR POS - Project Structure

## Root Directory Organization
```
├── src/                    # Main source code
├── assets/                 # Static assets (icons, images, splash)
├── .expo/                  # Expo configuration and cache
├── .kiro/                  # Kiro AI assistant configuration
├── app.json               # Expo app configuration
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── babel.config.js        # Babel transpiler configuration
├── metro.config.js        # Metro bundler configuration
├── jest.config.js         # Jest testing configuration
└── .env                   # Environment variables
```

## Source Code Structure (`src/`)

### Core Application (`src/app/`)
- **Expo Router**: File-based routing system
- `_layout.tsx`: Root layout with providers and global setup
- `index.tsx`: Main application entry point

### Components (`src/components/`)
**UI Components** (`src/components/ui/`)
- Base reusable components (Button, Input, Card, etc.)
- Error boundary and common UI patterns

**Feature Components** (root level)
- `products.tsx`, `collections.tsx`: Main feature screens
- `prod-form.tsx`, `col-form.tsx`: Form components
- `inventory.tsx`, `orders.tsx`: Business logic components
- `nav.tsx`, `tabs.tsx`, `menu.tsx`: Navigation components

**Specialized Components**
- `src/components/blocks/`: Content blocks and sections
- `src/components/bottom-tabs/`: Tab navigation components
- `src/components/media/`: Media handling components

### Business Logic (`src/lib/`)
- `instant.ts`: InstantDB configuration and setup
- `store-context.tsx`: Global store state management
- `auth-context.tsx`: Authentication state and logic
- `r2-service.ts`: Cloudflare R2 storage service
- `crud.ts`: Generic CRUD operations
- `logger.ts`: Logging utilities
- `haptics.ts`: Device haptic feedback

### Services (`src/services/`)
- `product-service.ts`: Product-specific business logic
- `validation-service.ts`: Data validation utilities

### Custom Hooks (`src/hooks/`)
- `useFiles.ts`: File management hook
- Custom hooks for common patterns

### Full-Screen Components (`src/screens/`)
- `auth.tsx`: Authentication screen
- `peoplea.tsx`: User profile management
- Option management screens
- Specialized full-screen interfaces

### Testing (`src/__tests__/`)
- `setup.ts`: Jest test configuration
- Test files co-located with components

## Architecture Patterns

### Component Organization
- **Feature-based**: Components grouped by business functionality
- **UI/Business Separation**: Base UI components separate from business logic
- **Screen vs Component**: Full-screen components in `screens/`, reusable in `components/`

### Data Flow
- **InstantDB**: Real-time database as single source of truth
- **React Context**: Global state management for auth and store data
- **Service Layer**: Business logic abstracted into services
- **Component State**: Local state for UI interactions

### File Naming Conventions
- **kebab-case**: File names use kebab-case (`prod-form.tsx`)
- **PascalCase**: Component names use PascalCase
- **Descriptive**: Names clearly indicate component purpose

### Import Patterns
- **Path Mapping**: `@/*` maps to `src/*` for clean imports
- **Relative Imports**: Used for closely related components
- **Absolute Imports**: Used for shared utilities and services

## Database Schema Organization
- **InstantDB Schema**: Defined in `instant.schema.ts`
- **Complex Relationships**: Products, items, inventory, orders, customers
- **Multi-location Support**: Location-based inventory tracking
- **Storefront Support**: Web storefront entities and relationships

## Asset Organization
- **Static Assets**: Icons, splash screens, adaptive icons in `assets/`
- **Dynamic Media**: User-uploaded content stored in Cloudflare R2
- **Image Optimization**: Expo Image for optimized loading

## Configuration Files
- **Environment**: `.env` for sensitive configuration
- **TypeScript**: Path mapping and strict type checking
- **Styling**: NativeWind integration with Tailwind
- **Testing**: Jest with React Native Testing Library setup
- **Build**: Expo and EAS configuration for deployment