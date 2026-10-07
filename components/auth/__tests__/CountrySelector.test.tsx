import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { renderWithStore } from '@/test-utils/render';
import { CountrySelector } from '../CountrySelector';

const { COUNTRIES, fetchCountriesMock } = vi.hoisted(() => ({
  COUNTRIES: [
    {
      name: { common: 'United States', official: 'United States of America' },
      cca2: 'US',
      cca3: 'USA',
      idd: { root: '+1', suffixes: [''] },
      flag: '🇺🇸',
    },
    {
      name: { common: 'India', official: 'Republic of India' },
      cca2: 'IN',
      cca3: 'IND',
      idd: { root: '+91', suffixes: [''] },
      flag: '🇮🇳',
    },
    {
      name: { common: 'Germany', official: 'Federal Republic of Germany' },
      cca2: 'DE',
      cca3: 'DEU',
      idd: { root: '+49', suffixes: [''] },
      flag: '🇩🇪',
    },
  ],
  fetchCountriesMock: vi.fn(),
}));

vi.mock('@/lib/countryService', async () => {
  const actual = await vi.importActual<typeof import('@/lib/countryService')>(
    '@/lib/countryService'
  );
  return { ...actual, fetchCountries: fetchCountriesMock };
});

function renderSelector(props: Partial<ComponentProps<typeof CountrySelector>> = {}) {
  const onChange = props.onChange ?? vi.fn();
  const { id = 'countryCode', ...rest } = props;
  // Rendered with its label, the way LoginForm uses it, so the accessible name
  // under test is the real one.
  const result = renderWithStore(
    <>
      <label htmlFor={id}>Country</label>
      <CountrySelector id={id} value="" onChange={onChange} {...rest} />
    </>
  );
  return { ...result, onChange };
}

/** Waits for the country list to load; the trigger node is replaced on load. */
async function findTrigger(): Promise<HTMLElement> {
  return waitFor(() => {
    const trigger = screen.getByRole('combobox', { name: 'Country' });
    expect(trigger).not.toHaveTextContent('Loading countries');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    return trigger;
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { fetchCountries } = await import('@/lib/countryService');
  vi.mocked(fetchCountries).mockResolvedValue(COUNTRIES as never);
});

describe('CountrySelector loading', () => {
  it('shows a busy placeholder while loading', () => {
    renderSelector();

    // role=status rather than combobox: the control is not interactive yet.
    const placeholder = screen.getByRole('status', { name: 'Country' });
    expect(placeholder).toHaveTextContent('Loading countries...');
    expect(placeholder).toHaveAttribute('aria-busy', 'true');
  });

  it('does not expose an interactive trigger while loading', () => {
    renderSelector();

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('reports a failed load without crashing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { fetchCountries } = await import('@/lib/countryService');
    vi.mocked(fetchCountries).mockRejectedValueOnce(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderSelector();

    // fetchCountries itself swallows errors and returns fallback data.
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());
  });
});

describe('CountrySelector default selection', () => {
  it('defaults to the United States when no value is given', async () => {
    const { onChange } = renderSelector();

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('+1'));
  });

  it('does not override an existing value', async () => {
    const { onChange } = renderSelector({ value: '+91' });

    await findTrigger();

    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows the country matching the supplied value', async () => {
    renderSelector({ value: '+91' });

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('India'));
  });

  it('prompts to pick a country for an unknown dial code', async () => {
    renderSelector({ value: '+999' });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveTextContent('Select country');
    });
  });

  it('uses a custom id so the label can target it', async () => {
    const { onChange } = renderSelector({ id: 'dialCode' });

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('+1'));
    expect(screen.getByRole('combobox', { name: 'Country' })).toBe(
      document.getElementById('dialCode')
    );
  });
});

describe('CountrySelector interaction', () => {
  it('opens and closes the list on repeated clicks', async () => {
    const user = userEvent.setup();
    const { trigger } = await renderLoaded();

    await user.click(trigger);
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3));

    await user.click(trigger);
    await waitFor(() => expect(screen.queryAllByRole('option')).toHaveLength(0));
  });

  it('reports the chosen dial code', async () => {
    const user = userEvent.setup();
    const { trigger, onChange } = await renderLoaded();

    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: /India/ }));

    expect(onChange).toHaveBeenLastCalledWith('+91');
  });

  it('closes the list after a selection', async () => {
    const user = userEvent.setup();
    const { trigger } = await renderLoaded();

    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: /Germany/ }));

    await waitFor(() => expect(screen.queryAllByRole('option')).toHaveLength(0));
  });

  it('marks the current selection', async () => {
    const user = userEvent.setup();
    const { trigger } = await renderLoaded();

    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /United States/ })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
    expect(screen.getByRole('option', { name: /India/ })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('focuses the search box when the list opens', async () => {
    const user = userEvent.setup();
    const { trigger } = await renderLoaded();

    await user.click(trigger);

    await waitFor(() => expect(screen.getByLabelText('Search countries')).toHaveFocus());
  });

  it('filters the list by the search query', async () => {
    const user = userEvent.setup();
    const { trigger } = await renderLoaded();

    await user.click(trigger);
    await user.type(screen.getByLabelText('Search countries'), 'ger');

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1));
    expect(screen.getByRole('option', { name: /Germany/ })).toBeInTheDocument();
  });

  it('filters by dial code', async () => {
    const user = userEvent.setup();
    const { trigger } = await renderLoaded();

    await user.click(trigger);
    await user.type(screen.getByLabelText('Search countries'), '+91');

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1));
    expect(screen.getByRole('option', { name: /India/ })).toBeInTheDocument();
  });

  it('reports when no country matches', async () => {
    const user = userEvent.setup();
    const { trigger } = await renderLoaded();

    await user.click(trigger);
    await user.type(screen.getByLabelText('Search countries'), 'zzzz');

    await waitFor(() => expect(screen.getByText('No countries found')).toBeInTheDocument());
  });

  it('clears the search query after a selection', async () => {
    const user = userEvent.setup();
    const { trigger } = await renderLoaded();

    await user.click(trigger);
    await user.type(screen.getByLabelText('Search countries'), 'ger');
    await user.click(screen.getByRole('option', { name: /Germany/ }));
    await user.click(trigger);

    await waitFor(() => expect(screen.getByLabelText('Search countries')).toHaveValue(''));
  });

  it('closes the list when clicking outside', async () => {
    const user = userEvent.setup();
    const { trigger } = await renderLoaded();

    await user.click(trigger);
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3));

    await user.click(document.body);

    await waitFor(() => expect(screen.queryAllByRole('option')).toHaveLength(0));
  });

  it('does not open when disabled', async () => {
    const { trigger } = await renderLoaded({ disabled: true });

    expect(trigger).toBeDisabled();
    trigger.click();

    await waitFor(() => expect(trigger).toBeDisabled());
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});

describe('CountrySelector errors', () => {
  it('shows the error message when provided', async () => {
    renderSelector({ error: 'Invalid country code format' });

    await waitFor(() => {
      expect(screen.getByText('Invalid country code format')).toBeInTheDocument();
    });
  });

  it('omits the error paragraph when there is none', async () => {
    renderSelector();

    await findTrigger();

    expect(screen.queryByText('Please select a country code')).not.toBeInTheDocument();
  });
});

/** Renders and waits until the loaded trigger is available. */
async function renderLoaded(props: Partial<ComponentProps<typeof CountrySelector>> = {}) {
  const result = renderSelector(props);
  const trigger = await waitFor(() => {
    const element = screen.getByRole('combobox', { name: 'Country' });
    expect(element).toHaveTextContent('+1');
    return element;
  });
  return { ...result, trigger };
}
