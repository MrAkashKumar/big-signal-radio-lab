"""Generate independent RF fixtures with decimal linear-power arithmetic."""
import argparse
import json
from decimal import Decimal, localcontext
from pathlib import Path

CASES = [
    ('hf-80m-100km', 'HF 3.5 MHz, 100 km', 3500000, 100000, 5, 0, 0, 1, 1, 2400, 6),
    ('hf-40m-1000km', 'HF 7 MHz, 1000 km', 7000000, 1000000, 100, 2.15, 2.15, 1, 1, 2400, 6),
    ('hf-20m-3000km', 'HF 14 MHz, 3000 km', 14000000, 3000000, 100, 2.15, 2.15, 1, 1, 2400, 6),
    ('hf-10m-3000km', 'HF 28 MHz, 3000 km', 28000000, 3000000, 100, 2.15, 2.15, 1, 1, 2400, 6),
    ('hf-qrp-narrow-filter', 'HF 7 MHz, 1 W, 500 Hz filter', 7000000, 1000000, 1, 0, 0, 2, 2, 500, 6),
    ('hf-very-narrow-filter', 'HF 14 MHz, 50 Hz test filter', 14000000, 3000000, 5, 0, 0, 1, 1, 50, 6),
    ('vhf-handheld', 'VHF 145 MHz, 5 W, 10 km', 145000000, 10000, 5, 2, 2, 1, 1, 12500, 5),
    ('uhf-link', 'UHF 435 MHz, 5 W, 10 km', 435000000, 10000, 5, 2, 2, 1, 1, 12500, 5),
    ('microwave-2ghz', 'Microwave 2.4 GHz, 1 W, 10 km', 2400000000, 10000, 1, 24, 24, 2, 2, 20000000, 7),
    ('microwave-5ghz', 'Microwave 5.8 GHz, 1 W, 10 km', 5800000000, 10000, 1, 24, 24, 2, 2, 20000000, 7),
    ('space-distance', '2.2 GHz, 384400 km free-space distance', 2200000000, 384400000, 20, 30, 40, 1, 1, 1000, 2),
    ('extreme-power', '145 MHz, 100 MW arithmetic stress', 145000000, 10000, 100000000, 0, 0, 0, 0, 12500, 5),
]


def generate():
    fixtures = []
    with localcontext() as context:
        context.prec = 60
        pi = Decimal('3.14159265358979323846264338327950288419716939937510582097494459')
        c = Decimal(299792458)
        k = Decimal('1.380649e-23')
        ten = Decimal(10)
        for id_, label, frequency, distance, watts, tx_gain, rx_gain, tx_loss, rx_loss, bandwidth, nf in CASES:
            frequency, distance, watts, tx_gain, rx_gain, tx_loss, rx_loss, bandwidth, nf = map(
                lambda value: Decimal(str(value)),
                (frequency, distance, watts, tx_gain, rx_gain, tx_loss, rx_loss, bandwidth, nf),
            )
            wavelength = c / frequency
            path_ratio = (4 * pi * distance / wavelength) ** 2
            received_watts = watts * ten ** (tx_gain / 10) * ten ** (rx_gain / 10)
            received_watts /= path_ratio * ten ** (tx_loss / 10) * ten ** (rx_loss / 10)
            noise_watts = k * 290 * bandwidth * ten ** (nf / 10)
            fixtures.append({
                'id': id_, 'label': label,
                'frequencyHz': float(frequency), 'distanceM': float(distance),
                'txPowerW': float(watts), 'txGainDbi': float(tx_gain), 'rxGainDbi': float(rx_gain),
                'txCableLossDb': float(tx_loss), 'rxCableLossDb': float(rx_loss),
                'bandwidthHz': float(bandwidth), 'noiseFigureDb': float(nf), 'temperatureK': 290,
                'expected': {
                    'pathLossDb': float(10 * path_ratio.log10()),
                    'receivedPowerDbm': float(10 * (received_watts * 1000).log10()),
                    'noiseFloorDbm': float(10 * (noise_watts * 1000).log10()),
                },
            })
    return json.dumps(fixtures, indent=2) + '\n'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    output = Path(__file__).parent / 'fixtures' / 'free-space-reference.json'
    contents = generate()
    if args.check:
        if output.read_text() != contents:
            raise SystemExit('Reference fixtures differ. Review changes before regenerating.')
        print('All 12 reference fixtures match the independent decimal calculation.')
    else:
        output.write_text(contents)
        print(f'Wrote {len(CASES)} reference fixtures to {output}.')
