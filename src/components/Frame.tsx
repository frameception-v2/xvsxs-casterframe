"use client";

import { useEffect, useCallback, useState } from "react";
import sdk, {
  AddFrame,
  SignIn as SignInCore,
  type Context,
} from "@farcaster/frame-sdk";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { config } from "~/components/providers/WagmiProvider";
import { truncateAddress } from "~/lib/truncateAddress";
import { base, optimism } from "wagmi/chains";
import { useSession } from "next-auth/react";
import { createStore } from "mipd";
import { Label } from "~/components/ui/label";
import { PROJECT_TITLE, NEYNAR_API_KEY, NEYNAR_API_URL } from "~/lib/constants";

function UserProfileCard({ fid }: { fid: number }) {
  const [profile, setProfile] = useState<any>(null);
  const [casts, setCasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user profile
        const profileRes = await fetch(
          `${NEYNAR_API_URL}/user?fid=${fid}&viewer_fid=${fid}`,
          {
            headers: { "api-key": NEYNAR_API_KEY! }
          }
        );
        const profileData = await profileRes.json();
        
        // Fetch user casts
        const castsRes = await fetch(
          `${NEYNAR_API_URL}/casts?fid=${fid}&limit=5`,
          {
            headers: { "api-key": NEYNAR_API_KEY! }
          }
        );
        const castsData = await castsRes.json();

        setProfile(profileData.result.user);
        setCasts(castsData.result.casts);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [fid]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="pt-4">
          <Label>Error loading profile data</Label>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <img 
            src={profile.pfp_url} 
            alt="Profile" 
            className="w-12 h-12 rounded-full"
          />
          <div>
            <CardTitle>{profile.display_name}</CardTitle>
            <CardDescription>@{profile.username}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm">{profile.profile.bio.text}</p>
          
          <div className="flex gap-4 text-sm">
            <div>
              <span className="font-semibold">{profile.follower_count}</span> followers
            </div>
            <div>
              <span className="font-semibold">{profile.following_count}</span> following
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-semibold mb-2">Recent Casts Analysis</h3>
            <div className="space-y-2">
              {casts.map((cast) => (
                <div key={cast.hash} className="p-2 border rounded">
                  <p className="text-sm">{cast.text}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(cast.timestamp).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Frame() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext>();
  const [added, setAdded] = useState(false);
  const [addFrameResult, setAddFrameResult] = useState("");

  const addFrame = useCallback(async () => {
    try {
      await sdk.actions.addFrame();
    } catch (error) {
      if (error instanceof AddFrame.RejectedByUser) {
        setAddFrameResult(`Not added: ${error.message}`);
      }
      if (error instanceof AddFrame.InvalidDomainManifest) {
        setAddFrameResult(`Not added: ${error.message}`);
      }
      setAddFrameResult(`Error: ${error}`);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const context = await sdk.context;
      if (!context) return;

      setContext(context);
      setAdded(context.client.added);

      if (!context.client.added) {
        addFrame();
      }

      sdk.on("frameAdded", ({ notificationDetails }) => {
        setAdded(true);
      });

      sdk.on("frameAddRejected", ({ reason }) => {
        console.log("frameAddRejected", reason);
      });

      sdk.on("frameRemoved", () => {
        setAdded(false);
      });

      sdk.actions.ready({});
      
      const store = createStore();
      store.subscribe((providerDetails) => {
        console.log("PROVIDER DETAILS", providerDetails);
      });
    };

    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
      return () => sdk.removeAllListeners();
    }
  }, [isSDKLoaded, addFrame]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{
      paddingTop: context?.client.safeAreaInsets?.top ?? 0,
      paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
      paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
      paddingRight: context?.client.safeAreaInsets?.right ?? 0,
    }}>
      <div className="w-[300px] mx-auto py-2 px-2">
        <h1 className="text-2xl font-bold text-center mb-4 text-neutral-900">
          {PROJECT_TITLE}
        </h1>
        {context?.frame?.fid ? (
          <UserProfileCard fid={context.frame.fid} />
        ) : (
          <Card>
            <CardContent className="pt-4">
              <Label>Sign in to view your profile analysis</Label>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
