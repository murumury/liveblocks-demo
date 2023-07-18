import {
  RoomProvider,
  useBroadcastEvent,
  useEventListener,
  useMyPresence,
  useOthers, useSelf
} from "../liveblocks.config";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Cursor from "../components/Cursor";
import FlyingReaction from "../components/FlyingReaction";
import ReactionSelector from "../components/ReactionSelector";
import useInterval from "../hooks/useInterval";
import styles from "../styles/Index.module.css";
/**
 * This file shows how to create Live Cursors with a small chat and interactions
 *
 * Because it's a bit more advanced that others examples, it's implemented using typescript to ensure that we introduce less bug while maintaining it.
 * It also uses Tailwind CSS for the styling
 */

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

enum CursorMode {
  Hidden,
  Chat,
  ReactionSelector,
  Reaction,
}

type CursorState =
  | {
      mode: CursorMode.Hidden;
    }
  | {
      mode: CursorMode.Chat;
      message: string;
      previousMessage: string | null;
    }
  | {
      mode: CursorMode.ReactionSelector;
    }
  | {
      mode: CursorMode.Reaction;
      reaction: string;
      isPressed: boolean;
    };

type Reaction = {
  value: string;
  timestamp: number;
  point: { x: number; y: number };
};

type ReactionEvent = {
  x: number;
  y: number;
  value: string;
};

function Example() {
  const others = useOthers();
  const [{ cursor }, updateMyPresence] = useMyPresence();
  const broadcast = useBroadcastEvent();
  const [state, setState] = useState<CursorState>({ mode: CursorMode.Hidden });
  const [reactions, setReactions] = useState<Reaction[]>([]);

  const setReaction = useCallback((reaction: string) => {
    setState({ mode: CursorMode.Reaction, reaction, isPressed: false });
  }, []);

  // Remove reactions that are not visible anymore (every 1 sec)
  useInterval(() => {
    setReactions((reactions) =>
      reactions.filter((reaction) => reaction.timestamp > Date.now() - 4000)
    );
  }, 1000);

  useInterval(() => {
    if (state.mode === CursorMode.Reaction && state.isPressed && cursor) {
      setReactions((reactions) =>
        reactions.concat([
          {
            point: { x: cursor.x, y: cursor.y },
            value: state.reaction,
            timestamp: Date.now(),
          },
        ])
      );
      broadcast({
        x: cursor.x,
        y: cursor.y,
        value: state.reaction,
      });
    }
  }, 100);

  useEffect(() => {
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "/") {
        setState({ mode: CursorMode.Chat, previousMessage: null, message: "" });
      } else if (e.key === "Escape") {
        updateMyPresence({ message: "" });
        setState({ mode: CursorMode.Hidden });
      } else if (e.key === "e") {
        setState({ mode: CursorMode.ReactionSelector });
      }
    }

    window.addEventListener("keyup", onKeyUp);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "/") {
        e.preventDefault();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [updateMyPresence]);

  useEventListener((eventData) => {
    const event = eventData.event as ReactionEvent;
    setReactions((reactions) =>
      reactions.concat([
        {
          point: { x: event.x, y: event.y },
          value: event.value,
          timestamp: Date.now(),
        },
      ])
    );
  });

  return (
    <>

      <div
        className="relative h-screen w-full flex items-center justify-center overflow-hidden touch-none"
        style={{
          cursor:
            state.mode === CursorMode.Chat
              ? "none"
              : "url(cursor.svg) 0 0, auto",
              backgroundImage: "url(/bg.svg)",
              backgroundSize: "cover",
              backgroundPosition: "center",
        }}
        onPointerMove={(event) => {
          event.preventDefault();
          if (cursor == null || state.mode !== CursorMode.ReactionSelector) {
            updateMyPresence({
              cursor: {
                x: Math.round(event.clientX),
                y: Math.round(event.clientY),
              },
            });
          }
        }}
        onPointerLeave={() => {
          setState({
            mode: CursorMode.Hidden,
          });
          updateMyPresence({
            cursor: null,
          });
        }}
        onPointerDown={(event) => {
          updateMyPresence({
            cursor: {
              x: Math.round(event.clientX),
              y: Math.round(event.clientY),
            },
          });
          setState((state) =>
            state.mode === CursorMode.Reaction
              ? { ...state, isPressed: true }
              : state
          );
        }}
        onPointerUp={() => {
          setState((state) =>
            state.mode === CursorMode.Reaction
              ? { ...state, isPressed: false }
              : state
          );
        }}
      >
        {reactions.map((reaction) => {
          return (
            <FlyingReaction
              key={reaction.timestamp.toString()}
              x={reaction.point.x}
              y={reaction.point.y}
              timestamp={reaction.timestamp}
              value={reaction.value}
            />
          );
        })}
        {cursor && (
          <div
            className="absolute top-0 left-0"
            style={{
              transform: `translateX(${cursor.x}px) translateY(${cursor.y}px)`,
            }}
          >
            {state.mode === CursorMode.Chat && (
              <>
                <img src="cursor.svg" />

                <div
                  className="absolute top-5 left-2 px-4 py-2 bg-blue-500 text-white leading-relaxed text-sm"
                  onKeyUp={(e) => e.stopPropagation()}
                  style={{
                    borderRadius: 20,
                  }}
                >
                  {state.previousMessage && <div>{state.previousMessage}</div>}
                  <input
                    className="bg-transparent border-none	outline-none text-white placeholder-blue-300 w-60"
                    autoFocus={true}
                    onChange={(e) => {
                      updateMyPresence({ message: e.target.value });
                      setState({
                        mode: CursorMode.Chat,
                        previousMessage: null,
                        message: e.target.value,
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setState({
                          mode: CursorMode.Chat,
                          previousMessage: state.message,
                          message: "",
                        });
                      } else if (e.key === "Escape") {
                        setState({
                          mode: CursorMode.Hidden,
                        });
                      }
                    }}
                    placeholder={state.previousMessage ? "" : "Say something…"}
                    value={state.message}
                    maxLength={50}
                  />
                </div>
              </>
            )}
            {state.mode === CursorMode.ReactionSelector && (
              <ReactionSelector
                setReaction={(reaction) => {
                  setReaction(reaction);
                }}
              />
            )}
            {state.mode === CursorMode.Reaction && (
              <div className="absolute top-3.5 left-1 pointer-events-none select-none">
                {state.reaction}
              </div>
            )}
          </div>
        )}

        {others.map(({ connectionId, presence }) => {
          if (presence == null || !presence.cursor) {
            return null;
          }

          return (
            <Cursor
              key={connectionId}
              color={COLORS[connectionId % COLORS.length]}
              x={presence.cursor.x}
              y={presence.cursor.y}
              message={presence.message}
            />
          );
        })}
      </div>
    </>
  );
}

export default function Page() {
  const roomId = useOverrideRoomId("nextjs-live-cursors-chat");

  return (

    <RoomProvider
      id={roomId}
      initialPresence={() => ({
        cursor: null,
        message: "",
      })}
    >
      <div >
       <div 
    style={{
      position: 'fixed',
  top:'22px',
  left:'24px',
  color:'#25252500',
  display: 'inline-block',
fontSize: '14px',
backgroundColor:'#ffffff00',
borderRadius:'20px',
zIndex:99999}}>
    <div style={{marginRight:'0px',marginLeft:'0px'}}>
        <div>
        <svg width="120" height="20" viewBox="0 0 120 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fillRule="evenodd" clipRule="evenodd" d="M24.3489 1.13008C24.9189 1.37008 25.2889 1.93008 25.2889 2.56008H25.2989V11.8401V17.4401C25.2989 18.3001 24.5989 19.0001 23.7389 19.0001H13.0389H1.4789C0.868897 19.0001 0.328897 18.6401 0.108897 18.0801C-0.111103 17.5101 0.018897 16.8801 0.458897 16.4601L12.0089 5.37008C12.4389 4.96008 13.0689 4.85008 13.6089 5.08008C14.1589 5.31008 14.5089 5.85008 14.5089 6.44008V9.24008L22.6589 1.43008C23.1089 1.00008 23.7689 0.88008 24.3489 1.13008ZM12.0389 16.5301V8.78008L3.9589 16.5301H6.9389C6.9889 16.4601 7.0489 16.3901 7.1189 16.3201L9.7189 13.8301C10.2189 13.3601 10.9989 13.3801 11.4689 13.8701C11.9389 14.3601 11.9189 15.1501 11.4289 15.6201L10.4789 16.5301H12.0389ZM14.5089 16.5301H22.8189V11.8401V4.70008L14.5089 12.6701V16.5301ZM113.309 4.42969C109.619 4.42969 106.619 7.42969 106.619 11.1297C106.619 14.8197 109.619 17.8297 113.309 17.8297C116.999 17.8297 119.999 14.8297 119.999 11.1297C119.999 7.43969 116.999 4.42969 113.309 4.42969ZM113.309 14.3597C111.529 14.3597 110.079 12.9097 110.079 11.1297C110.079 9.34969 111.529 7.89969 113.309 7.89969C115.089 7.89969 116.539 9.34969 116.539 11.1297C116.539 12.9097 115.089 14.3597 113.309 14.3597ZM49.3184 4.48047H53.0584V14.3205H57.8884V17.5405H49.3184V4.48047ZM59.5391 4.48047H63.2791V14.3205H68.1091V17.5405H59.5391V4.48047ZM73.5095 12.4805H77.8795V9.37047H73.5095V7.72047H78.2795V4.48047H69.7695V17.5405H78.3895V14.3205H73.5095V12.4805ZM100.429 4.49023C103.749 4.49023 105.479 5.75023 105.479 8.85023C105.479 10.9502 104.789 12.1802 103.209 12.7602L106.709 17.5402H102.289L99.5989 13.1602H98.8689V17.5402H95.1289V4.49023H100.429ZM98.8689 10.4802H99.7689C101.289 10.4802 101.799 10.0702 101.799 8.84023C101.799 7.64023 101.289 7.34023 99.7689 7.34023H98.8689V10.4802ZM89.1582 13.1004H86.5982V10.5804H93.2882V11.1404C93.2882 11.8304 93.1782 12.4904 92.9882 13.1104C92.1482 15.8504 89.5982 17.8404 86.5982 17.8404C82.9082 17.8404 79.9082 14.8304 79.9082 11.1404C79.9082 7.45043 82.9082 4.44043 86.5982 4.44043C87.9682 4.44043 89.2882 4.85043 90.4182 5.64043L88.4382 8.48043C87.8982 8.10043 87.2582 7.90043 86.5982 7.90043C84.8182 7.90043 83.3682 9.35043 83.3682 11.1304C83.3682 12.9104 84.8182 14.3604 86.5982 14.3604C87.6382 14.3604 88.5682 13.8704 89.1582 13.1004ZM39.028 4.44043L32.918 17.5404H36.618L37.468 15.7004H43.238L44.098 17.5404H47.798L41.638 4.44043H39.028ZM38.918 12.5704L40.368 9.47043L41.798 12.5704H38.918Z" fill="black"/>
</svg>


        </div>
      </div>      </div>
      <div style={{zIndex:99999,position:"relative",top:'620px',display:'grid',alignItems:'center',justifyItems:'center'}}>
      <svg width="379" height="76" viewBox="0 0 379 76" fill="none" xmlns="http://www.w3.org/2000/svg">
<g filter="url(#filter0_d_0_129)">
<rect x="150" y="16" width="84" height="36" rx="6" fill="white" shape-rendering="crispEdges"/>
<path d="M167.133 39.14C166.591 39.14 166.087 39.0653 165.621 38.916C165.154 38.7573 164.743 38.5007 164.389 38.146C164.043 37.7913 163.768 37.3247 163.563 36.746C163.367 36.158 163.269 35.43 163.269 34.562V33.82C163.269 32.9707 163.371 32.2567 163.577 31.678C163.782 31.09 164.062 30.6187 164.417 30.264C164.771 29.9093 165.177 29.6527 165.635 29.494C166.101 29.3353 166.601 29.256 167.133 29.256H167.315C167.8 29.256 168.262 29.3213 168.701 29.452C169.149 29.5827 169.541 29.7973 169.877 30.096C170.213 30.3947 170.479 30.7867 170.675 31.272C170.88 31.7573 170.983 32.3547 170.983 33.064H169.569C169.569 32.364 169.461 31.8273 169.247 31.454C169.041 31.0713 168.761 30.8053 168.407 30.656C168.052 30.5067 167.651 30.432 167.203 30.432C166.857 30.432 166.54 30.4833 166.251 30.586C165.961 30.6793 165.709 30.8427 165.495 31.076C165.28 31.3093 165.112 31.6267 164.991 32.028C164.879 32.42 164.823 32.9147 164.823 33.512V34.884C164.823 35.6773 164.921 36.298 165.117 36.746C165.322 37.194 165.602 37.5113 165.957 37.698C166.311 37.8753 166.722 37.964 167.189 37.964C167.655 37.964 168.071 37.8893 168.435 37.74C168.799 37.5907 169.083 37.3293 169.289 36.956C169.503 36.5733 169.611 36.0367 169.611 35.346H170.983C170.983 36.018 170.885 36.5967 170.689 37.082C170.493 37.5673 170.222 37.9593 169.877 38.258C169.541 38.5567 169.149 38.7807 168.701 38.93C168.262 39.07 167.795 39.14 167.301 39.14H167.133ZM172.872 39V28.92H174.272V32.798C174.524 32.434 174.846 32.1633 175.238 31.986C175.639 31.7993 176.05 31.706 176.47 31.706C176.955 31.706 177.384 31.7993 177.758 31.986C178.131 32.1727 178.425 32.4527 178.64 32.826C178.864 33.19 178.976 33.6473 178.976 34.198V39H177.576V34.436C177.576 33.848 177.436 33.428 177.156 33.176C176.885 32.9147 176.502 32.784 176.008 32.784C175.69 32.784 175.396 32.8633 175.126 33.022C174.864 33.1807 174.654 33.3953 174.496 33.666C174.346 33.9273 174.272 34.2307 174.272 34.576V39H172.872ZM183.045 39.14C182.663 39.14 182.294 39.0793 181.939 38.958C181.594 38.8367 181.309 38.6313 181.085 38.342C180.871 38.0433 180.763 37.642 180.763 37.138C180.763 36.6247 180.875 36.214 181.099 35.906C181.333 35.5887 181.659 35.346 182.079 35.178C182.509 35.01 183.017 34.898 183.605 34.842C184.203 34.786 184.856 34.758 185.565 34.758V34.03C185.565 33.526 185.439 33.176 185.187 32.98C184.945 32.7747 184.557 32.672 184.025 32.672C183.577 32.672 183.19 32.77 182.863 32.966C182.537 33.1527 182.373 33.4513 182.373 33.862V34.03H181.015C181.006 33.9833 181.001 33.9367 181.001 33.89C181.001 33.834 181.001 33.778 181.001 33.722C181.001 33.3113 181.127 32.9567 181.379 32.658C181.641 32.35 181.991 32.1167 182.429 31.958C182.877 31.79 183.386 31.706 183.955 31.706H184.151C185.094 31.706 185.794 31.8927 186.251 32.266C186.718 32.6393 186.951 33.176 186.951 33.876V37.67C186.951 37.838 186.989 37.9593 187.063 38.034C187.138 38.1087 187.227 38.146 187.329 38.146C187.432 38.146 187.539 38.1273 187.651 38.09C187.773 38.0527 187.88 38.006 187.973 37.95V38.846C187.852 38.9393 187.703 39.0093 187.525 39.056C187.348 39.112 187.138 39.14 186.895 39.14C186.597 39.14 186.354 39.084 186.167 38.972C185.99 38.8507 185.859 38.692 185.775 38.496C185.691 38.3 185.64 38.0807 185.621 37.838C185.351 38.258 184.996 38.58 184.557 38.804C184.128 39.028 183.624 39.14 183.045 39.14ZM183.605 38.146C183.932 38.146 184.245 38.076 184.543 37.936C184.842 37.7867 185.085 37.5627 185.271 37.264C185.467 36.9653 185.565 36.592 185.565 36.144V35.612C184.865 35.612 184.263 35.6493 183.759 35.724C183.255 35.7893 182.868 35.92 182.597 36.116C182.336 36.312 182.205 36.6153 182.205 37.026C182.205 37.418 182.322 37.7027 182.555 37.88C182.789 38.0573 183.139 38.146 183.605 38.146ZM191.624 39.14C191.278 39.14 190.966 39.084 190.686 38.972C190.415 38.86 190.2 38.6827 190.042 38.44C189.892 38.188 189.818 37.8567 189.818 37.446V32.938H189.034V31.846H189.86L190.35 29.564H191.218V31.846H192.884V32.938H191.218V37.194C191.218 37.6047 191.302 37.866 191.47 37.978C191.638 38.09 191.82 38.146 192.016 38.146C192.118 38.146 192.258 38.1227 192.436 38.076C192.622 38.0293 192.772 37.9827 192.884 37.936V38.874C192.781 38.93 192.655 38.9767 192.506 39.014C192.366 39.0607 192.216 39.0933 192.058 39.112C191.908 39.1307 191.764 39.14 191.624 39.14Z" fill="black"/>
<path d="M213.75 28H214.75L210.25 40H209.25L213.75 28Z" fill="#666666"/>
<rect x="202.5" y="24.5" width="19" height="19" rx="5.5" stroke="#D4D5D7"/>
</g>
<g filter="url(#filter1_d_0_129)">
<rect x="242" y="16" width="113" height="36" rx="6" fill="white" shape-rendering="crispEdges"/>
<path d="M255.657 39V29.396H262.013L261.831 30.572H257.141V33.512H261.383V34.688H257.141V37.824H261.915L262.111 39H255.657ZM266.238 39.14C265.744 39.14 265.314 39.0793 264.95 38.958C264.586 38.8367 264.283 38.678 264.04 38.482C263.798 38.2767 263.616 38.0527 263.494 37.81C263.373 37.558 263.312 37.3107 263.312 37.068C263.312 37.012 263.312 36.9653 263.312 36.928C263.312 36.8813 263.317 36.8253 263.326 36.76H264.558C264.549 36.788 264.544 36.816 264.544 36.844C264.544 36.8627 264.544 36.886 264.544 36.914C264.544 37.1847 264.628 37.4133 264.796 37.6C264.974 37.7773 265.207 37.9127 265.496 38.006C265.795 38.0993 266.131 38.146 266.504 38.146C266.822 38.146 267.111 38.104 267.372 38.02C267.643 37.936 267.853 37.8147 268.002 37.656C268.161 37.488 268.24 37.292 268.24 37.068C268.24 36.8067 268.156 36.606 267.988 36.466C267.82 36.3167 267.596 36.2047 267.316 36.13C267.036 36.046 266.728 35.976 266.392 35.92C266.066 35.8547 265.73 35.7847 265.384 35.71C265.048 35.626 264.74 35.514 264.46 35.374C264.18 35.234 263.956 35.0427 263.788 34.8C263.62 34.548 263.536 34.2167 263.536 33.806C263.536 33.4887 263.606 33.1993 263.746 32.938C263.886 32.6767 264.087 32.4573 264.348 32.28C264.61 32.0933 264.918 31.9533 265.272 31.86C265.636 31.7573 266.033 31.706 266.462 31.706H266.644C267.055 31.706 267.428 31.762 267.764 31.874C268.1 31.9767 268.39 32.1213 268.632 32.308C268.875 32.4853 269.057 32.6907 269.178 32.924C269.309 33.148 269.374 33.386 269.374 33.638C269.374 33.6847 269.37 33.736 269.36 33.792C269.36 33.8387 269.36 33.8713 269.36 33.89H268.128V33.736C268.128 33.6427 268.105 33.54 268.058 33.428C268.021 33.3067 267.937 33.1947 267.806 33.092C267.685 32.98 267.512 32.8867 267.288 32.812C267.074 32.7373 266.794 32.7 266.448 32.7C266.122 32.7 265.851 32.7327 265.636 32.798C265.422 32.8633 265.254 32.9473 265.132 33.05C265.02 33.1527 264.941 33.26 264.894 33.372C264.848 33.484 264.824 33.5867 264.824 33.68C264.824 33.904 264.908 34.086 265.076 34.226C265.244 34.3567 265.468 34.4593 265.748 34.534C266.028 34.6087 266.336 34.674 266.672 34.73C267.018 34.786 267.358 34.856 267.694 34.94C268.03 35.0147 268.338 35.1267 268.618 35.276C268.898 35.416 269.122 35.612 269.29 35.864C269.458 36.116 269.542 36.4427 269.542 36.844C269.542 37.264 269.463 37.6233 269.304 37.922C269.146 38.2113 268.926 38.4447 268.646 38.622C268.366 38.7993 268.044 38.93 267.68 39.014C267.316 39.098 266.929 39.14 266.518 39.14H266.238ZM274.134 39.14C273.537 39.14 273.005 38.9953 272.538 38.706C272.072 38.4073 271.703 37.992 271.432 37.46C271.171 36.928 271.04 36.3027 271.04 35.584V35.248C271.04 34.7067 271.12 34.2213 271.278 33.792C271.446 33.3533 271.67 32.98 271.95 32.672C272.24 32.3547 272.576 32.1167 272.958 31.958C273.35 31.79 273.77 31.706 274.218 31.706H274.372C274.96 31.706 275.474 31.8273 275.912 32.07C276.351 32.3033 276.692 32.6393 276.934 33.078C277.186 33.5073 277.312 34.03 277.312 34.646H276.066C276.066 34.2073 275.992 33.8433 275.842 33.554C275.693 33.2647 275.488 33.05 275.226 32.91C274.965 32.77 274.671 32.7 274.344 32.7C273.812 32.7 273.369 32.882 273.014 33.246C272.669 33.61 272.496 34.1607 272.496 34.898V35.92C272.496 36.6573 272.669 37.2127 273.014 37.586C273.36 37.9593 273.808 38.146 274.358 38.146C274.704 38.146 275.007 38.0807 275.268 37.95C275.53 37.81 275.735 37.6 275.884 37.32C276.034 37.0307 276.108 36.6573 276.108 36.2H277.312C277.312 36.8253 277.177 37.3573 276.906 37.796C276.645 38.2347 276.286 38.5707 275.828 38.804C275.38 39.028 274.872 39.14 274.302 39.14H274.134ZM280.948 39.14C280.565 39.14 280.196 39.0793 279.842 38.958C279.496 38.8367 279.212 38.6313 278.988 38.342C278.773 38.0433 278.666 37.642 278.666 37.138C278.666 36.6247 278.778 36.214 279.002 35.906C279.235 35.5887 279.562 35.346 279.982 35.178C280.411 35.01 280.92 34.898 281.508 34.842C282.105 34.786 282.758 34.758 283.468 34.758V34.03C283.468 33.526 283.342 33.176 283.09 32.98C282.847 32.7747 282.46 32.672 281.928 32.672C281.48 32.672 281.092 32.77 280.766 32.966C280.439 33.1527 280.276 33.4513 280.276 33.862V34.03H278.918C278.908 33.9833 278.904 33.9367 278.904 33.89C278.904 33.834 278.904 33.778 278.904 33.722C278.904 33.3113 279.03 32.9567 279.282 32.658C279.543 32.35 279.893 32.1167 280.332 31.958C280.78 31.79 281.288 31.706 281.858 31.706H282.054C282.996 31.706 283.696 31.8927 284.154 32.266C284.62 32.6393 284.854 33.176 284.854 33.876V37.67C284.854 37.838 284.891 37.9593 284.966 38.034C285.04 38.1087 285.129 38.146 285.232 38.146C285.334 38.146 285.442 38.1273 285.554 38.09C285.675 38.0527 285.782 38.006 285.876 37.95V38.846C285.754 38.9393 285.605 39.0093 285.428 39.056C285.25 39.112 285.04 39.14 284.798 39.14C284.499 39.14 284.256 39.084 284.07 38.972C283.892 38.8507 283.762 38.692 283.678 38.496C283.594 38.3 283.542 38.0807 283.524 37.838C283.253 38.258 282.898 38.58 282.46 38.804C282.03 39.028 281.526 39.14 280.948 39.14ZM281.508 38.146C281.834 38.146 282.147 38.076 282.446 37.936C282.744 37.7867 282.987 37.5627 283.174 37.264C283.37 36.9653 283.468 36.592 283.468 36.144V35.612C282.768 35.612 282.166 35.6493 281.662 35.724C281.158 35.7893 280.77 35.92 280.5 36.116C280.238 36.312 280.108 36.6153 280.108 37.026C280.108 37.418 280.224 37.7027 280.458 37.88C280.691 38.0573 281.041 38.146 281.508 38.146ZM287.467 41.534V31.846H288.517L288.713 32.84C288.946 32.4853 289.25 32.21 289.623 32.014C289.996 31.8087 290.43 31.706 290.925 31.706C291.466 31.706 291.952 31.8273 292.381 32.07C292.82 32.3033 293.17 32.686 293.431 33.218C293.692 33.75 293.823 34.45 293.823 35.318V35.584C293.823 36.3493 293.692 36.998 293.431 37.53C293.179 38.062 292.838 38.4633 292.409 38.734C291.989 39.0047 291.522 39.14 291.009 39.14C290.505 39.14 290.071 39.042 289.707 38.846C289.352 38.65 289.072 38.398 288.867 38.09V41.534H287.467ZM290.631 38.132C290.958 38.132 291.252 38.048 291.513 37.88C291.774 37.712 291.98 37.46 292.129 37.124C292.278 36.788 292.353 36.3727 292.353 35.878V35.094C292.353 34.5153 292.278 34.0533 292.129 33.708C291.98 33.3533 291.774 33.0967 291.513 32.938C291.252 32.7793 290.958 32.7 290.631 32.7C290.314 32.7 290.02 32.7793 289.749 32.938C289.478 33.0873 289.259 33.3347 289.091 33.68C288.932 34.0253 288.853 34.492 288.853 35.08V35.878C288.853 36.382 288.932 36.802 289.091 37.138C289.25 37.474 289.464 37.726 289.735 37.894C290.006 38.0527 290.304 38.132 290.631 38.132ZM298.609 39.14C297.974 39.14 297.414 39.0047 296.929 38.734C296.453 38.454 296.08 38.048 295.809 37.516C295.538 36.9747 295.403 36.326 295.403 35.57V35.276C295.403 34.5107 295.543 33.862 295.823 33.33C296.112 32.798 296.504 32.3967 296.999 32.126C297.494 31.846 298.058 31.706 298.693 31.706H298.847C299.426 31.706 299.939 31.8273 300.387 32.07C300.835 32.3127 301.18 32.658 301.423 33.106C301.675 33.554 301.801 34.086 301.801 34.702V35.598H296.859C296.859 36.13 296.929 36.5873 297.069 36.97C297.218 37.3527 297.428 37.6467 297.699 37.852C297.979 38.048 298.32 38.146 298.721 38.146C299.057 38.146 299.356 38.0807 299.617 37.95C299.878 37.8193 300.088 37.6187 300.247 37.348C300.406 37.0773 300.485 36.7413 300.485 36.34H301.801C301.801 36.9093 301.666 37.404 301.395 37.824C301.124 38.244 300.756 38.5707 300.289 38.804C299.832 39.028 299.314 39.14 298.735 39.14H298.609ZM296.873 34.758H300.429C300.429 34.058 300.275 33.54 299.967 33.204C299.668 32.868 299.248 32.7 298.707 32.7C298.212 32.7 297.788 32.8727 297.433 33.218C297.088 33.5633 296.901 34.0767 296.873 34.758Z" fill="black"/>
<path d="M318.108 38V29.768H323.196L323.076 30.344H318.756V33.512H322.584V34.088H318.756V37.424H323.184L323.316 38H318.108ZM325.211 36.116C325.203 36.156 325.199 36.212 325.199 36.284C325.199 36.692 325.375 37.008 325.727 37.232C326.087 37.456 326.575 37.568 327.191 37.568C327.743 37.568 328.171 37.46 328.475 37.244C328.779 37.02 328.931 36.728 328.931 36.368C328.931 36.088 328.843 35.868 328.667 35.708C328.499 35.548 328.287 35.428 328.031 35.348C327.783 35.26 327.447 35.176 327.023 35.096C326.535 35 326.143 34.904 325.847 34.808C325.551 34.704 325.299 34.544 325.091 34.328C324.883 34.112 324.779 33.812 324.779 33.428C324.779 32.932 324.979 32.528 325.379 32.216C325.779 31.904 326.371 31.748 327.155 31.748C327.667 31.748 328.091 31.832 328.427 32C328.763 32.168 329.007 32.38 329.159 32.636C329.319 32.884 329.399 33.14 329.399 33.404L329.387 33.572H328.787V33.416C328.787 33.16 328.671 32.912 328.439 32.672C328.215 32.424 327.751 32.3 327.047 32.3C326.367 32.3 325.919 32.416 325.703 32.648C325.495 32.88 325.391 33.132 325.391 33.404C325.391 33.636 325.471 33.824 325.631 33.968C325.791 34.112 325.991 34.224 326.231 34.304C326.471 34.376 326.803 34.456 327.227 34.544C327.715 34.648 328.115 34.752 328.427 34.856C328.739 34.96 329.003 35.124 329.219 35.348C329.435 35.572 329.543 35.872 329.543 36.248C329.543 36.904 329.315 37.38 328.859 37.676C328.411 37.972 327.803 38.12 327.035 38.12C326.451 38.12 325.975 38.028 325.607 37.844C325.247 37.66 324.987 37.436 324.827 37.172C324.675 36.908 324.599 36.656 324.599 36.416C324.599 36.32 324.599 36.248 324.599 36.2C324.607 36.152 324.611 36.124 324.611 36.116H325.211ZM336.037 35.636C336.037 36.156 335.933 36.604 335.725 36.98C335.517 37.348 335.233 37.632 334.873 37.832C334.513 38.024 334.105 38.12 333.649 38.12C333.145 38.12 332.697 38 332.305 37.76C331.921 37.512 331.621 37.156 331.405 36.692C331.189 36.228 331.081 35.672 331.081 35.024V34.844C331.081 34.196 331.185 33.64 331.393 33.176C331.609 32.712 331.909 32.36 332.293 32.12C332.685 31.872 333.133 31.748 333.637 31.748C334.093 31.748 334.501 31.848 334.861 32.048C335.229 32.24 335.517 32.524 335.725 32.9C335.933 33.268 336.037 33.712 336.037 34.232H335.437C335.437 33.608 335.265 33.132 334.921 32.804C334.585 32.468 334.157 32.3 333.637 32.3C333.061 32.3 332.593 32.512 332.233 32.936C331.873 33.36 331.693 33.972 331.693 34.772V35.096C331.693 35.896 331.873 36.508 332.233 36.932C332.601 37.356 333.073 37.568 333.649 37.568C334.169 37.568 334.597 37.404 334.933 37.076C335.269 36.748 335.437 36.268 335.437 35.636H336.037Z" fill="#666666"/>
<rect x="311.5" y="24.5" width="31" height="19" rx="5.5" stroke="#D4D5D7"/>
</g>
<g filter="url(#filter2_d_0_129)">
<rect x="24" y="16" width="118" height="36" rx="6" fill="white" shape-rendering="crispEdges"/>
<path d="M41.7891 29.396C42.6384 29.396 43.3338 29.5967 43.8751 29.998C44.4258 30.3993 44.7011 30.95 44.7011 31.65C44.7011 32.2753 44.5331 32.8073 44.1971 33.246C43.8704 33.6847 43.4644 33.9507 42.9791 34.044V34.114C43.4271 34.2913 43.7958 34.5993 44.0851 35.038C44.3744 35.4767 44.5191 36.004 44.5191 36.62C44.5191 37.1333 44.5471 37.5207 44.6031 37.782C44.6591 38.0433 44.7338 38.2253 44.8271 38.328C44.9204 38.4307 45.0558 38.51 45.2331 38.566V38.958C45.0278 39.042 44.8084 39.084 44.5751 39.084C44.1271 39.084 43.7771 38.9533 43.5251 38.692C43.2731 38.4213 43.1471 37.9173 43.1471 37.18C43.1471 36.424 42.9884 35.836 42.6711 35.416C42.3631 34.9867 41.9758 34.772 41.5091 34.772H39.0731V39H37.7011V29.396H41.7891ZM39.0731 30.642V33.526H41.8031C42.2044 33.526 42.5591 33.3907 42.8671 33.12C43.1751 32.8493 43.3291 32.5133 43.3291 32.112V32.056C43.3291 31.6453 43.1891 31.3093 42.9091 31.048C42.6291 30.7773 42.2604 30.642 41.8031 30.642H39.0731ZM49.742 31.706C50.33 31.706 50.848 31.832 51.296 32.084C51.7533 32.3267 52.108 32.6767 52.36 33.134C52.612 33.5913 52.738 34.1233 52.738 34.73V35.724H47.74C47.7586 36.48 47.936 37.0633 48.272 37.474C48.608 37.8847 49.1073 38.09 49.77 38.09C50.358 38.09 50.792 37.9173 51.072 37.572C51.352 37.2267 51.492 36.816 51.492 36.34H52.738C52.738 36.9 52.6073 37.39 52.346 37.81C52.094 38.23 51.7393 38.5567 51.282 38.79C50.834 39.0233 50.3206 39.14 49.742 39.14H49.686C48.678 39.14 47.88 38.818 47.292 38.174C46.7133 37.5207 46.424 36.6527 46.424 35.57V35.29C46.424 34.5807 46.5546 33.9553 46.816 33.414C47.0773 32.8727 47.4506 32.4527 47.936 32.154C48.4213 31.8553 48.9906 31.706 49.644 31.706H49.742ZM49.672 32.756C49.14 32.756 48.706 32.9193 48.37 33.246C48.0433 33.5727 47.8426 34.058 47.768 34.702H51.436V34.534C51.436 34.002 51.2726 33.5727 50.946 33.246C50.6286 32.9193 50.204 32.756 49.672 32.756ZM57.4653 31.706C58.4079 31.706 59.1079 31.8927 59.5653 32.266C60.0319 32.6393 60.2653 33.1807 60.2653 33.89V37.6C60.2653 37.768 60.3026 37.894 60.3773 37.978C60.4519 38.0527 60.5453 38.09 60.6573 38.09C60.8719 38.09 61.0866 38.0247 61.3013 37.894V38.86C60.9839 39.0467 60.6246 39.14 60.2233 39.14C59.8219 39.14 59.5233 39.028 59.3273 38.804C59.1313 38.5707 59.0239 38.2533 59.0053 37.852C58.4266 38.7107 57.5913 39.14 56.4993 39.14C55.7153 39.14 55.1273 38.972 54.7353 38.636C54.3526 38.2907 54.1613 37.7493 54.1613 37.012C54.1613 36.4333 54.3106 35.9807 54.6093 35.654C54.9079 35.318 55.4026 35.0753 56.0933 34.926C56.7839 34.7767 57.7359 34.702 58.9493 34.702V34.044C58.9493 33.568 58.8093 33.2367 58.5293 33.05C58.2493 32.854 57.8433 32.756 57.3113 32.756C56.8073 32.756 56.4153 32.854 56.1353 33.05C55.8553 33.246 55.7153 33.5213 55.7153 33.876V34.044H54.4273C54.4086 33.9133 54.3993 33.7593 54.3993 33.582C54.3993 33.2553 54.5299 32.9473 54.7913 32.658C55.0526 32.3687 55.4073 32.14 55.8553 31.972C56.3033 31.7947 56.7979 31.706 57.3393 31.706H57.4653ZM58.9493 35.724C57.9693 35.724 57.2273 35.7753 56.7233 35.878C56.2286 35.9713 55.8973 36.116 55.7293 36.312C55.5613 36.508 55.4773 36.7787 55.4773 37.124C55.4773 37.768 55.9673 38.09 56.9473 38.09C57.2926 38.09 57.6193 38.006 57.9273 37.838C58.2353 37.6607 58.4826 37.4133 58.6693 37.096C58.8559 36.7787 58.9493 36.4147 58.9493 36.004V35.724ZM65.6407 31.706C66.21 31.706 66.7187 31.832 67.1667 32.084C67.624 32.3267 67.9787 32.672 68.2307 33.12C68.4827 33.568 68.6087 34.0813 68.6087 34.66H67.3067C67.3067 34.0813 67.1574 33.6193 66.8587 33.274C66.5694 32.9287 66.1494 32.756 65.5987 32.756C65.02 32.756 64.558 32.952 64.2127 33.344C63.8767 33.7267 63.7087 34.254 63.7087 34.926V35.682C63.7087 36.494 63.8767 37.1007 64.2127 37.502C64.5487 37.894 65.0247 38.09 65.6407 38.09C66.21 38.09 66.6347 37.922 66.9147 37.586C67.204 37.2407 67.3487 36.7787 67.3487 36.2H68.6087C68.6087 37.096 68.338 37.81 67.7967 38.342C67.2647 38.874 66.5507 39.14 65.6547 39.14H65.5427C64.908 39.14 64.3527 38.9953 63.8767 38.706C63.4007 38.4073 63.032 37.992 62.7707 37.46C62.5187 36.928 62.3927 36.3073 62.3927 35.598V35.262C62.3927 34.5527 62.5234 33.932 62.7847 33.4C63.046 32.8587 63.4147 32.4433 63.8907 32.154C64.3667 31.8553 64.9127 31.706 65.5287 31.706H65.6407ZM71.9959 31.846H73.6619V32.896H71.9959V37.166C71.9959 37.502 72.0613 37.7447 72.1919 37.894C72.3226 38.0433 72.5233 38.118 72.7939 38.118C73.0366 38.118 73.3259 38.048 73.6619 37.908V38.888C73.3259 39.056 72.8919 39.14 72.3599 39.14C71.8093 39.14 71.3893 38.9767 71.0999 38.65C70.8199 38.3233 70.6799 37.8053 70.6799 37.096V32.896H69.8959V31.846H70.7219L71.1699 29.564H71.9959V31.846ZM76.6398 28.92V30.138H75.2678V28.92H76.6398ZM76.6118 31.846V39H75.2958V31.846H76.6118ZM81.7885 31.706C82.7872 31.706 83.5852 32.014 84.1825 32.63C84.7798 33.246 85.0785 34.0907 85.0785 35.164V35.682C85.0785 36.7553 84.7845 37.6 84.1965 38.216C83.6085 38.832 82.8058 39.14 81.7885 39.14C80.7712 39.14 79.9685 38.832 79.3805 38.216C78.7925 37.6 78.4985 36.7553 78.4985 35.682V35.164C78.4985 34.0907 78.7972 33.246 79.3945 32.63C79.9918 32.014 80.7898 31.706 81.7885 31.706ZM81.7885 32.756C81.1632 32.756 80.6778 32.9707 80.3325 33.4C79.9872 33.8293 79.8145 34.4593 79.8145 35.29V35.556C79.8145 36.368 79.9825 36.9933 80.3185 37.432C80.6638 37.8707 81.1538 38.09 81.7885 38.09C82.4045 38.09 82.8852 37.8753 83.2305 37.446C83.5852 37.0073 83.7625 36.3773 83.7625 35.556V35.29C83.7625 34.478 83.5898 33.8527 83.2445 33.414C82.9085 32.9753 82.4232 32.756 81.7885 32.756ZM90.4996 31.706C91.2836 31.706 91.8996 31.916 92.3476 32.336C92.7956 32.756 93.0196 33.372 93.0196 34.184V39H91.7036V34.422C91.7036 33.3113 91.1996 32.756 90.1916 32.756C89.8556 32.756 89.5429 32.8447 89.2536 33.022C88.9642 33.1993 88.7309 33.442 88.5536 33.75C88.3762 34.0487 88.2876 34.38 88.2876 34.744V39H86.9716V31.846H87.9236L88.1056 32.896C88.7029 32.1027 89.5009 31.706 90.4996 31.706ZM98.0004 31.706C98.5324 31.706 99.0037 31.79 99.4144 31.958C99.8344 32.126 100.156 32.3593 100.38 32.658C100.614 32.9567 100.73 33.288 100.73 33.652L100.716 33.904H99.4144V33.778C99.4144 33.0967 98.8871 32.756 97.8324 32.756C96.7871 32.756 96.2644 33.0687 96.2644 33.694C96.2644 33.9833 96.4137 34.198 96.7124 34.338C97.0111 34.4687 97.4684 34.5947 98.0844 34.716C98.6724 34.8373 99.1531 34.9633 99.5264 35.094C99.9091 35.2247 100.231 35.43 100.492 35.71C100.763 35.99 100.898 36.368 100.898 36.844C100.898 37.6093 100.637 38.1833 100.114 38.566C99.5917 38.9487 98.8404 39.14 97.8604 39.14H97.6504C97.0624 39.14 96.5491 39.0513 96.1104 38.874C95.6717 38.6873 95.3311 38.44 95.0884 38.132C94.8551 37.8147 94.7431 37.46 94.7524 37.068V36.76H96.0544V36.9C96.0544 37.6933 96.7217 38.09 98.0564 38.09C98.4484 38.09 98.7984 38.0013 99.1064 37.824C99.4237 37.6467 99.5824 37.404 99.5824 37.096C99.5824 36.8347 99.4937 36.6293 99.3164 36.48C99.1484 36.3307 98.9384 36.2187 98.6864 36.144C98.4344 36.0693 98.0844 35.9947 97.6364 35.92C97.0577 35.808 96.5911 35.696 96.2364 35.584C95.8817 35.4627 95.5784 35.262 95.3264 34.982C95.0744 34.702 94.9484 34.3193 94.9484 33.834C94.9484 33.1713 95.2097 32.6533 95.7324 32.28C96.2551 31.8973 96.9691 31.706 97.8744 31.706H98.0004Z" fill="black"/>
<path d="M117.547 38V29.768H122.635L122.515 30.344H118.195V33.512H122.023V34.088H118.195V37.424H122.623L122.755 38H117.547Z" fill="#666666"/>
<rect x="110.5" y="24.5" width="19" height="19" rx="5.5" stroke="#D4D5D7"/>
</g>
<defs>
<filter id="filter0_d_0_129" x="126" y="0" width="132" height="84" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="8"/>
<feGaussianBlur stdDeviation="12"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.2 0 0 0 0 0.2 0 0 0 0 0.2 0 0 0 0.2 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_0_129"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_0_129" result="shape"/>
</filter>
<filter id="filter1_d_0_129" x="218" y="0" width="161" height="84" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="8"/>
<feGaussianBlur stdDeviation="12"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.2 0 0 0 0 0.2 0 0 0 0 0.2 0 0 0 0.2 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_0_129"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_0_129" result="shape"/>
</filter>
<filter id="filter2_d_0_129" x="0" y="0" width="166" height="84" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="8"/>
<feGaussianBlur stdDeviation="12"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.2 0 0 0 0 0.2 0 0 0 0 0.2 0 0 0 0.2 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_0_129"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_0_129" result="shape"/>
</filter>
</defs>
</svg>



      </div>
      <Example />
      </div>
    </RoomProvider>
  );
}

export async function getStaticProps() {
  const API_KEY = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
  const API_KEY_WARNING = process.env.CODESANDBOX_SSE
    ? `Add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` secret in CodeSandbox.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-cursors-chat#codesandbox.`
    : `Create an \`.env.local\` file and add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` environment variable.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-cursors-chat#getting-started.`;

  if (!API_KEY) {
    console.warn(API_KEY_WARNING);
  }

  return { props: {} };
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useOverrideRoomId(roomId: string) {
  const { query } = useRouter();
  const overrideRoomId = useMemo(() => {
    return query?.roomId ? `${roomId}-${query.roomId}` : roomId;
  }, [query, roomId]);

  return overrideRoomId;
}
