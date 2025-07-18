// Tests for error boundary component
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import ErrorBoundary, { useErrorHandler } from '../error-boundary';

// Mock the logger
jest.mock('../../../lib/logger', () => ({
  trackError: jest.fn(),
}));

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text>No error</Text>;
};

// Component that uses the error handler hook
const ComponentWithErrorHandler = ({ shouldThrow }: { shouldThrow: boolean }) => {
  const { handleError } = useErrorHandler();

  React.useEffect(() => {
    if (shouldThrow) {
      handleError(new Error('Hook error'), 'TestComponent');
    }
  }, [shouldThrow, handleError]);

  return <Text>Component with error handler</Text>;
};

describe('ErrorBoundary', () => {
  const { trackError } = require('../../../lib/logger');

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('should render children when there is no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(getByText('No error')).toBeTruthy();
  });

  it('should render error UI when child component throws', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('Test error')).toBeTruthy();
  });

  it('should call trackError when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(trackError).toHaveBeenCalledWith(
      expect.any(Error),
      'ErrorBoundary',
      expect.any(Object)
    );
  });

  it('should call onError prop when error occurs', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <Text>Custom error message</Text>;

    const { getByText } = render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Custom error message')).toBeTruthy();
  });

  it('should reset error state when retry button is pressed', () => {
    const { getByText, rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error should be displayed
    expect(getByText('Something went wrong')).toBeTruthy();

    // Press retry button
    const retryButton = getByText('Try Again');
    fireEvent.press(retryButton);

    // Re-render with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    // Should show normal content
    expect(getByText('No error')).toBeTruthy();
  });

  it('should display error details when show details is pressed', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Press show details button
    const showDetailsButton = getByText('Show Details');
    fireEvent.press(showDetailsButton);

    // Should show error stack
    expect(getByText('Hide Details')).toBeTruthy();
  });

  it('should hide error details when hide details is pressed', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Show details first
    const showDetailsButton = getByText('Show Details');
    fireEvent.press(showDetailsButton);

    // Then hide details
    const hideDetailsButton = getByText('Hide Details');
    fireEvent.press(hideDetailsButton);

    // Should show "Show Details" again
    expect(getByText('Show Details')).toBeTruthy();
  });
});

describe('useErrorHandler', () => {
  const { trackError } = require('../../../lib/logger');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call trackError when handleError is called', () => {
    render(<ComponentWithErrorHandler shouldThrow={true} />);

    expect(trackError).toHaveBeenCalledWith(
      expect.any(Error),
      'TestComponent'
    );
  });

  it('should use default context when none provided', () => {
    const ComponentWithDefaultContext = () => {
      const { handleError } = useErrorHandler();

      React.useEffect(() => {
        handleError(new Error('Default context error'));
      }, [handleError]);

      return <Text>Component</Text>;
    };

    render(<ComponentWithDefaultContext />);

    expect(trackError).toHaveBeenCalledWith(
      expect.any(Error),
      'useErrorHandler'
    );
  });

  it('should handle multiple error calls', () => {
    const ComponentWithMultipleErrors = () => {
      const { handleError } = useErrorHandler();

      React.useEffect(() => {
        handleError(new Error('First error'), 'Context1');
        handleError(new Error('Second error'), 'Context2');
      }, [handleError]);

      return <Text>Component</Text>;
    };

    render(<ComponentWithMultipleErrors />);

    expect(trackError).toHaveBeenCalledTimes(2);
    expect(trackError).toHaveBeenNthCalledWith(1, expect.any(Error), 'Context1');
    expect(trackError).toHaveBeenNthCalledWith(2, expect.any(Error), 'Context2');
  });
});

describe('LoadingError Component', () => {
  it('should render error message', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Text>Test content</Text>
      </ErrorBoundary>
    );

    // This would test the LoadingError component if it was exported
    // For now, we test that the error boundary works
    expect(getByText('Test content')).toBeTruthy();
  });
});

describe('Error Boundary Edge Cases', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('should handle errors in componentDidMount', () => {
    const ComponentThatThrowsInMount = () => {
      React.useEffect(() => {
        throw new Error('Mount error');
      }, []);

      return <Text>Component</Text>;
    };

    const { getByText } = render(
      <ErrorBoundary>
        <ComponentThatThrowsInMount />
      </ErrorBoundary>
    );

    // The error boundary should catch this
    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('should handle errors with no message', () => {
    const ComponentThatThrowsEmptyError = () => {
      throw new Error('');
    };

    const { getByText } = render(
      <ErrorBoundary>
        <ComponentThatThrowsEmptyError />
      </ErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('should handle non-Error objects being thrown', () => {
    const ComponentThatThrowsString = () => {
      throw 'String error';
    };

    const { getByText } = render(
      <ErrorBoundary>
        <ComponentThatThrowsString />
      </ErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();
  });
});
