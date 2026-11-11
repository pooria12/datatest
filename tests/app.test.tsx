import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { App } from '../src/app/App';
import { router } from '../src/app/router';
import { Logo } from '../src/components/common/Logo';

const renderApp = () => render(<App />);

const goTo = async (path: string) => {
  await act(async () => {
    await router.navigate(path);
  });
};

describe('Frontend Application', () => {
  beforeEach(async () => {
    await goTo('/');
  });

  it('renders without crashing', () => {
    const { container } = renderApp();
    expect(container).toBeInTheDocument();
  });

  it('displays DataMind AI branding', () => {
    renderApp();
    expect(screen.getByText('DataMind AI')).toBeInTheDocument();
  });

  it('renders dashboard content once the stored dataset has been checked', async () => {
    renderApp();
    expect(await screen.findByText(/Welcome to DataMind AI/)).toBeInTheDocument();
    expect(await screen.findByText('Turn messy data into clear insights')).toBeInTheDocument();
  });

  it('has navigation sidebar', () => {
    renderApp();
    expect(screen.getByRole('navigation', { name: /navigation/i })).toBeInTheDocument();
  });
});

describe('Routing', () => {
  beforeEach(async () => {
    await goTo('/');
  });

  it('links every sidebar item to its page', () => {
    renderApp();
    const nav = screen.getByRole('navigation', { name: 'Navigation' });
    expect(within(nav).getAllByRole('link')).toHaveLength(8);
  });

  it('navigates from the sidebar and updates the breadcrumb', async () => {
    renderApp();
    const nav = screen.getByRole('navigation', { name: 'Navigation' });
    fireEvent.click(within(nav).getByRole('link', { name: /Upload Dataset/ }));
    expect(router.state.location.pathname).toBe('/upload');
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByText('Upload Dataset')).toBeInTheDocument();
    expect(within(breadcrumb).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });

  it('shows a Not Found page for unknown routes', async () => {
    renderApp();
    await goTo('/does-not-exist');
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Dashboard' }));
    expect(router.state.location.pathname).toBe('/');
  });

  it('Preview empty-state button goes to the upload page', async () => {
    renderApp();
    await goTo('/preview');
    const button = await screen.findByRole('button', { name: 'Upload Dataset' });
    const historyBefore = window.history.length;
    fireEvent.click(button);
    expect(router.state.location.pathname).toBe('/upload');
    // One click must add exactly one history entry (the empty state used to navigate twice).
    expect(window.history.length - historyBefore).toBe(1);
  });
});

describe('Dashboard', () => {
  beforeEach(async () => {
    await goTo('/');
  });

  it('links every available feature card to its page and disables planned ones', async () => {
    renderApp();
    const links = await screen.findAllByRole('link', { name: /Get Started/ });
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/upload',
      '/preview',
      '/quality',
      '/analysis',
    ]);
    const planned = screen.getAllByRole('button', { name: 'Coming Soon' });
    expect(planned).toHaveLength(2);
    planned.forEach((button) => expect(button).toBeDisabled());
  });

  it('never nests links inside buttons', async () => {
    const { container } = renderApp();
    await screen.findByText('Turn messy data into clear insights');
    expect(container.querySelectorAll('button a')).toHaveLength(0);
  });
});

describe('Sidebar', () => {
  beforeEach(async () => {
    await goTo('/');
  });

  it('is off-screen on mobile until the menu button is pressed', () => {
    renderApp();
    const sidebar = screen.getByLabelText('Main navigation');
    expect(sidebar).toHaveClass('-translate-x-full');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }));
    expect(sidebar).toHaveClass('translate-x-0');
    expect(sidebar).not.toHaveClass('-translate-x-full');
  });

  it('collapses and expands on desktop', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(screen.getByLabelText('Main navigation')).toHaveClass('lg:w-20');
    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(screen.getByLabelText('Main navigation')).not.toHaveClass('lg:w-20');
  });
});

describe('Theme', () => {
  beforeEach(async () => {
    await goTo('/');
  });

  it('header toggle switches the dark class and persists the choice', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('dark');

    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('settings buttons set light, dark and system', async () => {
    renderApp();
    await goTo('/settings');

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Light' }));
    expect(document.documentElement).not.toHaveClass('dark');
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'System' }));
    expect(localStorage.getItem('theme')).toBe('system');
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('header toggle and settings buttons stay in sync', async () => {
    renderApp();
    await goTo('/settings');
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not render a fake Save button', async () => {
    renderApp();
    await goTo('/settings');
    expect(screen.queryByRole('button', { name: /Save Settings/ })).not.toBeInTheDocument();
  });
});

describe('Logo Component', () => {
  it('renders logo with text', () => {
    render(<Logo showText={true} />);
    expect(screen.getByText('DataMind AI')).toBeInTheDocument();
  });

  it('renders logo without text', () => {
    render(<Logo showText={false} />);
    expect(screen.queryByText('DataMind AI')).not.toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    const { container } = render(<Logo size="lg" />);
    expect(container.querySelector('div[class*="h-10"]')).toBeInTheDocument();
  });

  it('passes the size to the icon instead of overriding it with CSS classes', () => {
    const { container } = render(<Logo size="lg" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '22');
    expect(svg?.getAttribute('class')).not.toMatch(/\bh-4\b/);
  });
});
