import wordmarkOnDark from '../../assets/brand/eatchinese-wordmark-on-dark.svg';
import wordmarkOnLight from '../../assets/brand/eatchinese-wordmark-on-light.svg';

type BrandMarkProps = {
  size?: 'md' | 'lg';
};

// BrandMark is the EatChinese logo lockup: wordmark and city badge. Both wordmark
// variants are rendered and CSS shows the one that fits the current theme.
export function BrandMark({ size = 'md' }: BrandMarkProps) {
  return (
    <span className={`brand brand--${size}`}>
      <img className="brand-wordmark brand-wordmark--on-dark" src={wordmarkOnDark} alt="EatChinese" />
      <img className="brand-wordmark brand-wordmark--on-light" src={wordmarkOnLight} alt="EatChinese" />
      <span className="brand-badge">MTL</span>
    </span>
  );
}
