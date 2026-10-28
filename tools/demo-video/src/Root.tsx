import { Composition, staticFile } from 'remotion';
import { Film, filmDuration, FPS, type FilmProps } from './Composition';

export const RemotionRoot = () => <Composition
  id="Okno"
  component={Film}
  width={1920}
  height={1080}
  fps={FPS}
  durationInFrames={660}
  defaultProps={{ clips: [], music: true } satisfies FilmProps}
  calculateMetadata={async () => {
    const response = await fetch(staticFile('manifest.json'));
    if (!response.ok) throw new Error('Run npm run prepare after recording before rendering');
    const data = await response.json();
    if (!data.clips?.length) throw new Error('The recording manifest has no completed clips');
    return { durationInFrames: filmDuration(data.clips), props: { clips: data.clips, music: true } };
  }}
/>;
