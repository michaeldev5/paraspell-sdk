import { FC } from 'react';
import { allChannelsQueryDocument, channelQueryDocument } from '../../api/channels';
import { totalMessageCountsQueryDocument } from '../../api/messages';
import { useSelectedParachain } from '../../context/SelectedParachain/useSelectedParachain';
import { CountOption } from '../../gql/graphql';
import { Ecosystem } from '../../types/types';
import ParachainsGraph from './ParachainsGraph';
import { useQuery } from '@apollo/client';

const now = Date.now();

type Props = {
  ecosystem: Ecosystem;
  updateTrigger: number;
};

const ParachainsGraphContainer: FC<Props> = ({ ecosystem, updateTrigger }) => {
  const { dateRange, channelId, parachainArrangement } = useSelectedParachain();

  const [start, end] = dateRange;

  const { data } = useQuery(allChannelsQueryDocument, {
    variables: {
      startTime: start && end ? start.getTime() / 1000 : 1,
      endTime: start && end ? end.getTime() / 1000 : now
    }
  });
  const totalCountsQuery = useQuery(totalMessageCountsQueryDocument, {
    variables: {
      startTime: start && end ? start.getTime() / 1000 : 1,
      endTime: start && end ? end.getTime() / 1000 : now,
      countBy: parachainArrangement ?? CountOption.ORIGIN
    }
  });

  const channelQuery = useQuery(channelQueryDocument, { variables: { id: channelId ?? 1 } });

  if (data && totalCountsQuery.data) {
    return (
      <ParachainsGraph
        channels={data.channels}
        totalMessageCounts={totalCountsQuery.data?.totalMessageCounts}
        ecosystem={ecosystem}
        updateTrigger={updateTrigger}
        selectedChannel={channelQuery.data?.channel}
      />
    );
  }

  return <></>;
};

export default ParachainsGraphContainer;
