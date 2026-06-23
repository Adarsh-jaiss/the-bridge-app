import { MaterialIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { registerUserOnboarding } from "../../lib/api/user";

const TOTAL_STEPS = 3;

type PickedFile = {
  uri: string;
  name: string;
};

export default function Register() {
  const router = useRouter();
  const navigation = useNavigation();
  const { email: prefilledEmail } = useLocalSearchParams<{ email?: string }>();

  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [rank, setRank] = useState("");
  const [licenceFile, setLicenceFile] = useState<PickedFile | null>(null);
  const [licenceType, setLicenceType] = useState("");
  const [licenceNumber, setLicenceNumber] = useState("");
  const [semanBookFile, setSemanBookFile] = useState<PickedFile | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const progressWidth = useMemo<`${number}%`>(() => `${(step / TOTAL_STEPS) * 100}%`, [step]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (step <= 1) return;
      event.preventDefault();
      if (isSubmitting) return;
      setError("");
      setStep((prev) => Math.max(1, prev - 1));
    });

    return unsubscribe;
  }, [isSubmitting, navigation, step]);

  const goNext = () => {
    setError("");
    if (isSubmitting) return;

    if (step === 1) {
      if (!firstName.trim()) {
        setError("Please enter your first name.");
        return;
      }
      if (!lastName.trim()) {
        setError("Please enter your last name.");
        return;
      }
      if (!companyName.trim()) {
        setError("Please enter your company name.");
        return;
      }
      if (!rank.trim()) {
        setError("Please enter your rank.");
        return;
      }
    }

    if (step === 2) {
      if (!licenceFile?.uri) {
        setError("Please upload your licence file.");
        return;
      }
      if (!licenceType.trim()) {
        setError("Please enter your licence type.");
        return;
      }
      if (!licenceNumber.trim()) {
        setError("Please enter your licence number.");
        return;
      }
      if (!semanBookFile?.uri) {
        setError("Please upload your seman book file.");
        return;
      }
    }

    if (step < TOTAL_STEPS) {
      setStep((prev) => prev + 1);
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (isSubmitting) return;

    if (step !== 3) return;

    if (!termsAccepted) {
      setError("Please accept the terms to submit your registration.");
      return;
    }
    if (!licenceFile?.uri || !semanBookFile?.uri) {
      setError("Please complete all required file uploads.");
      return;
    }

    setIsSubmitting(true);
    try {
      await registerUserOnboarding({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        company_name: companyName.trim(),
        rank: rank.trim(),
        licence: licenceFile.uri,
        licence_type: licenceType.trim(),
        licence_number: licenceNumber.trim(),
        seman_book: semanBookFile.uri,
      });

      Alert.alert("Registration Submitted", "Your account details were submitted successfully.", [
        {
          text: "OK",
          onPress: () =>
            router.replace({
              pathname: "/home",
            }),
        },
      ]);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to submit registration. Please try again.");
      if (err.status === 401) {
        Alert.alert(
          "Session Required",
          "Please verify your OTP first, then complete registration.",
          [{ text: "OK", onPress: () => router.replace("/auth/login") }]
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    setError("");
    if (isSubmitting) return;
    if (step === 1) {
      router.back();
      return;
    }
    setStep((prev) => prev - 1);
  };

  const clearError = () => {
    if (error) setError("");
  };

  const pickFile = async (field: "licence" | "semanBook") => {
    if (isSubmitting) return;
    clearError();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const selectedAsset = result.assets[0];
      if (!selectedAsset?.uri) return;

      const file: PickedFile = {
        uri: selectedAsset.uri,
        name: selectedAsset.name || "selected-file",
      };

      if (field === "licence") {
        setLicenceFile(file);
        return;
      }
      setSemanBookFile(file);
    } catch {
      setError("Unable to pick file. Please try again.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="absolute top-[-10%] -left-[20%] w-[80%] h-[40%] rounded-full bg-primary-fixed-dim opacity-10 blur-3xl pointer-events-none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 px-6 pt-3 pb-6"
      >
        <View className="flex-row items-center justify-between mb-8">
          <Pressable
            onPress={goBack}
            className="w-10 h-10 rounded-full bg-surface-container-low items-center justify-center"
          >
            <MaterialIcons name="arrow-back" size={20} color="#0050cb" />
          </Pressable>
          <Text className="text-on-surface font-bold text-lg">The Bridge</Text>
          <View className="w-10" />
        </View>

        <View className="mb-8">
          <View className="flex-row items-end justify-between mb-3">
            <View>
              <Text className="text-[10px] uppercase tracking-widest text-secondary font-bold">
                Step {String(step).padStart(2, "0")} of {String(TOTAL_STEPS).padStart(2, "0")}
              </Text>
              <Text className="text-[28px] font-extrabold tracking-tight text-on-surface mt-1">
                Registration
              </Text>
            </View>
            <Text className="text-sm text-outline">Maritime Profile</Text>
          </View>

          <View className="h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
            <View className="h-full bg-primary rounded-full" style={{ width: progressWidth }} />
          </View>
        </View>

        <View className="flex-1">
          {step === 1 ? (
            <View className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 gap-5">
              {!!prefilledEmail && (
                <View>
                  <Text className="text-[11px] uppercase tracking-widest text-outline mb-2">Verified Email</Text>
                  <View className="h-12 rounded-xl px-4 bg-surface-container-low justify-center">
                    <Text className="text-on-surface-variant">{prefilledEmail}</Text>
                  </View>
                </View>
              )}

              <View>
                <Text className="text-[11px] uppercase tracking-widest text-outline mb-2">First Name</Text>
                <TextInput
                  value={firstName}
                  onChangeText={(val) => {
                    setFirstName(val);
                    clearError();
                  }}
                  placeholder="e.g. James"
                  placeholderTextColor="#727687"
                  className="h-12 rounded-xl px-4 bg-surface-container-low text-on-surface"
                />
              </View>

              <View>
                <Text className="text-[11px] uppercase tracking-widest text-outline mb-2">Last Name</Text>
                <TextInput
                  value={lastName}
                  onChangeText={(val) => {
                    setLastName(val);
                    clearError();
                  }}
                  placeholder="e.g. Sullivan"
                  placeholderTextColor="#727687"
                  className="h-12 rounded-xl px-4 bg-surface-container-low text-on-surface"
                />
              </View>

              <View>
                <Text className="text-[11px] uppercase tracking-widest text-outline mb-2">Company Name</Text>
                <TextInput
                  value={companyName}
                  onChangeText={(val) => {
                    setCompanyName(val);
                    clearError();
                  }}
                  placeholder="e.g. Maritime Global Ltd."
                  placeholderTextColor="#727687"
                  className="h-12 rounded-xl px-4 bg-surface-container-low text-on-surface"
                />
              </View>

              <View>
                <Text className="text-[11px] uppercase tracking-widest text-outline mb-2">Rank</Text>
                <TextInput
                  value={rank}
                  onChangeText={(val) => {
                    setRank(val);
                    clearError();
                  }}
                  placeholder="e.g. Chief Engineer"
                  placeholderTextColor="#727687"
                  className="h-12 rounded-xl px-4 bg-surface-container-low text-on-surface"
                />
              </View>
            </View>
          ) : null}

          {step === 2 ? (
            <View className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 gap-5">
              <View>
                <Text className="text-[11px] uppercase tracking-widest text-outline mb-2">Licence</Text>
                <Pressable
                  onPress={() => pickFile("licence")}
                  className="h-12 rounded-xl px-4 bg-surface-container-low flex-row items-center justify-between"
                >
                  <Text className={`${licenceFile ? "text-on-surface" : "text-outline"} text-sm flex-1`} numberOfLines={1}>
                    {licenceFile ? licenceFile.name : "Upload licence file (PDF/Image)"}
                  </Text>
                  <MaterialIcons name={licenceFile ? "check-circle" : "upload-file"} size={18} color={licenceFile ? "#0050cb" : "#727687"} />
                </Pressable>
              </View>

              <View>
                <Text className="text-[11px] uppercase tracking-widest text-outline mb-2">Licence Type</Text>
                <TextInput
                  value={licenceType}
                  onChangeText={(val) => {
                    setLicenceType(val);
                    clearError();
                  }}
                  placeholder="e.g. STCW"
                  placeholderTextColor="#727687"
                  className="h-12 rounded-xl px-4 bg-surface-container-low text-on-surface"
                />
              </View>

              <View>
                <Text className="text-[11px] uppercase tracking-widest text-outline mb-2">Licence Number</Text>
                <TextInput
                  value={licenceNumber}
                  onChangeText={(val) => {
                    setLicenceNumber(val);
                    clearError();
                  }}
                  placeholder="e.g. LIC-458932"
                  placeholderTextColor="#727687"
                  className="h-12 rounded-xl px-4 bg-surface-container-low text-on-surface"
                />
              </View>

              <View>
                <Text className="text-[11px] uppercase tracking-widest text-outline mb-2">Seman Book</Text>
                <Pressable
                  onPress={() => pickFile("semanBook")}
                  className="h-12 rounded-xl px-4 bg-surface-container-low flex-row items-center justify-between"
                >
                  <Text className={`${semanBookFile ? "text-on-surface" : "text-outline"} text-sm flex-1`} numberOfLines={1}>
                    {semanBookFile ? semanBookFile.name : "Upload seman book file (PDF/Image)"}
                  </Text>
                  <MaterialIcons name={semanBookFile ? "check-circle" : "upload-file"} size={18} color={semanBookFile ? "#0050cb" : "#727687"} />
                </Pressable>
              </View>
            </View>
          ) : null}

          {step === 3 ? (
            <View className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/20">
              <Text className="text-on-surface font-bold text-lg mb-4">Review & Consent</Text>
              <Text className="text-on-surface-variant text-sm mb-4 leading-6">
                Please verify your details before submission.
              </Text>

              <View className="rounded-xl bg-surface-container-lowest px-4 py-3 mb-6">
                <Text className="text-on-surface text-sm font-medium">
                  {firstName} {lastName}
                </Text>
                <Text className="text-on-surface-variant text-xs mt-1">
                  {rank} at {companyName}
                </Text>
              </View>

              <Text className="text-on-surface-variant text-sm mb-6 leading-6">
                I certify that all submitted details are authentic and up to date. I agree to The Bridge&apos;s
                verification process and terms.
              </Text>

              <Pressable
                onPress={() => {
                  setTermsAccepted((prev) => !prev);
                  clearError();
                }}
                className="flex-row items-center"
              >
                <View
                  className={`w-6 h-6 rounded-md mr-3 items-center justify-center border ${
                    termsAccepted
                      ? "bg-primary border-primary"
                      : "bg-surface-container-lowest border-outline-variant"
                  }`}
                >
                  {termsAccepted ? <MaterialIcons name="check" size={16} color="#ffffff" /> : null}
                </View>
                <Text className="text-on-surface text-sm flex-1">
                  I accept the registration terms and verification process.
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {error ? <Text className="text-error text-sm mb-3 text-center">{error}</Text> : null}

        {step < TOTAL_STEPS ? (
          <Pressable
            onPress={goNext}
            className="w-full h-14 rounded-full bg-primary-container flex-row items-center justify-center active:opacity-80"
          >
            <Text className="text-on-primary-container font-bold text-base mr-2">Continue</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`w-full h-14 rounded-full flex-row items-center justify-center active:opacity-80 ${
              isSubmitting ? "bg-surface-container-highest" : "bg-primary-container"
            }`}
          >
            <Text
              className={`font-bold text-base mr-2 ${
                isSubmitting ? "text-on-surface-variant" : "text-on-primary-container"
              }`}
            >
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </Text>
            <MaterialIcons
              name={isSubmitting ? "hourglass-top" : "check"}
              size={20}
              color={isSubmitting ? "#727687" : "#ffffff"}
            />
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
